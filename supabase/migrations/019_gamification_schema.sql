-- Gamification Schema: Trofeo della Birra

-- 1. Legs definition
CREATE TABLE IF NOT EXISTS public.gamification_legs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    distance_km NUMERIC(10,2) NOT NULL,
    cumulative_km NUMERIC(10,2) NOT NULL, -- Distance from start (Genova)
    start_port TEXT NOT NULL,
    end_port TEXT NOT NULL
);

INSERT INTO public.gamification_legs (name, distance_km, cumulative_km, start_port, end_port) VALUES
('Genova → Elba', 190, 190, 'Genova', 'Portoferraio'),
('Elba → Napoli', 310, 500, 'Portoferraio', 'Napoli'),
('Napoli → Olbia', 270, 770, 'Napoli', 'Olbia'),
('Olbia → Bastia', 170, 940, 'Olbia', 'Bastia'),
('Bastia → Genova', 200, 1140, 'Bastia', 'Genova')
ON CONFLICT DO NOTHING;

-- 2. Global settings for the trophy
CREATE TABLE IF NOT EXISTS public.gamification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_leg_id INTEGER REFERENCES public.gamification_legs(id) DEFAULT 1,
    start_date DATE DEFAULT '2025-09-01', -- Start of sports year
    is_active BOOLEAN DEFAULT true
);

INSERT INTO public.gamification_settings (current_leg_id, start_date) 
VALUES (1, '2025-09-01')
ON CONFLICT DO NOTHING;

-- 3. Athlete points per leg
CREATE TABLE IF NOT EXISTS public.athlete_leg_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    leg_id INTEGER REFERENCES public.gamification_legs(id),
    points INTEGER DEFAULT 0,
    rank INTEGER,
    virtual_km NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(athlete_id, leg_id)
);

-- 4. View or Function to calculate virtual distance
-- Logic: (Sum of distance_km where present) * (Present Sessions / Total Sessions from Sep 1st)
-- Actually user says: "las % de presenza saranno moltiplicate per i km fatti. Quindi se faccio 100km, ma ho il 70% di presenze, i Km saranno 70Km."
-- Presence % = (sessions attended) / (expected sessions from Sep 1st to today)
-- Expected sessions = 6 per week.

CREATE OR REPLACE FUNCTION calculate_athlete_virtual_km(p_athlete_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_total_days INTEGER;
    v_expected_sessions INTEGER;
    v_attended_sessions INTEGER;
    v_presence_ratio NUMERIC;
    v_total_km NUMERIC;
    v_virtual_km NUMERIC;
BEGIN
    SELECT start_date INTO v_start_date FROM public.gamification_settings LIMIT 1;
    
    -- Total days from start to today
    v_total_days := CURRENT_DATE - v_start_date;
    IF v_total_days < 0 THEN v_total_days := 0; END IF;
    
    -- Expected sessions: 6 per week (approx 6/7 sessions per day)
    -- More accurately: weeks * 6
    v_expected_sessions := CEIL(v_total_days / 7.0) * 6;
    IF v_expected_sessions = 0 THEN v_expected_sessions := 1; END IF;
    
    -- Count presences
    SELECT COUNT(*) INTO v_attended_sessions 
    FROM public.athlete_attendance 
    WHERE athlete_id = p_athlete_id 
      AND date >= v_start_date 
      AND is_present = true;
      
    v_presence_ratio := v_attended_sessions::NUMERIC / v_expected_sessions::NUMERIC;
    IF v_presence_ratio > 1 THEN v_presence_ratio := 1; END IF;
    
    -- Sum of declared KM
    SELECT COALESCE(SUM(distance_km), 0) INTO v_total_km 
    FROM public.athlete_attendance 
    WHERE athlete_id = p_athlete_id 
      AND date >= v_start_date 
      AND is_present = true;
      
    v_virtual_km := v_total_km * v_presence_ratio;
    
    RETURN ROUND(v_virtual_km, 2);
END;
$$;

-- 5. RPC to get leaderboard with specific visibility rules
-- Top 5 always, then self and 5 neighbors before/after.
CREATE OR REPLACE FUNCTION get_gamification_leaderboard(p_athlete_id UUID)
RETURNS TABLE (
    rank BIGINT,
    athlete_id UUID,
    full_name TEXT,
    virtual_km NUMERIC,
    total_points BIGINT,
    is_me BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RankedAthletes AS (
        SELECT 
            a.id as aid,
            a.full_name as fname,
            calculate_athlete_virtual_km(a.id) as vkm,
            COALESCE((SELECT SUM(points) FROM public.athlete_leg_points p WHERE p.athlete_id = a.id), 0) as pts,
            RANK() OVER (ORDER BY calculate_athlete_virtual_km(a.id) DESC) as rnk
        FROM public.athletes a
        WHERE a.status = 'active'
    ),
    MyRank AS (
        SELECT rnk FROM RankedAthletes WHERE aid = p_athlete_id
    )
    SELECT 
        ra.rnk,
        ra.aid,
        ra.fname,
        ra.vkm,
        ra.pts,
        (ra.aid = p_athlete_id) as is_me
    FROM RankedAthletes ra
    CROSS JOIN MyRank mr
    WHERE ra.rnk <= 5 -- Top 5
       OR (ra.rnk >= mr.rnk - 5 AND ra.rnk <= mr.rnk + 5) -- Self + neighbors
    ORDER BY ra.rnk ASC;
END;
$$;

-- 6. Trigger to check "Top 20" rule and advance stage
-- This would be complex in a trigger because KM change on every attendance update.
-- Better as an RPC or just check in frontend/backend logic.
-- I'll create an RPC that the backend can call or call from dashboard.

CREATE OR REPLACE FUNCTION check_and_advance_leg()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_leg_id INTEGER;
    v_next_leg_id INTEGER;
    v_leg_distance NUMERIC;
    v_top_20_count INTEGER;
BEGIN
    SELECT current_leg_id INTO v_current_leg_id FROM public.gamification_settings LIMIT 1;
    SELECT cumulative_km INTO v_leg_distance FROM public.gamification_legs WHERE id = v_current_leg_id;
    
    -- Count how many athletes reached the cumulative distance of current leg
    -- Actually user says "arrivano al primo traguardo" -> meaning the distance of the LEG itself? 
    -- "quando i primi 20 atleti arriveranno al primo traguardo, anche tutti gli altri passeranno alla nuova tratta"
    -- This implies we should check if 20 athletes have vkm >= cumulative_km of current leg.
    
    WITH AthleteDistance AS (
        SELECT calculate_athlete_virtual_km(id) as vkm
        FROM public.athletes
        WHERE status = 'active'
    )
    SELECT COUNT(*) INTO v_top_20_count FROM AthleteDistance WHERE vkm >= v_leg_distance;
    
    IF v_top_20_count >= 20 AND v_current_leg_id < 5 THEN
        -- Assign points for the current leg before moving
        PERFORM assign_leg_points(v_current_leg_id);
        
        -- Advance leg
        UPDATE public.gamification_settings SET current_leg_id = v_current_leg_id + 1;
    END IF;
END;
$$;

-- Helper to assign points based on current ranking
CREATE OR REPLACE FUNCTION assign_leg_points(p_leg_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_points INTEGER;
BEGIN
    FOR r IN (
        SELECT id, calculate_athlete_virtual_km(id) as vkm,
               RANK() OVER (ORDER BY calculate_athlete_virtual_km(id) DESC) as rnk
        FROM public.athletes
        WHERE status = 'active'
    ) LOOP
        -- Point distribution: 1:50, 2:45, 3:40, 4:30, 5:18, 6:17... 22:1, 23+: 0
        IF r.rnk = 1 THEN v_points := 50;
        ELSIF r.rnk = 2 THEN v_points := 45;
        ELSIF r.rnk = 3 THEN v_points := 40;
        ELSIF r.rnk = 4 THEN v_points := 30;
        ELSIF r.rnk >= 5 AND r.rnk <= 22 THEN v_points := 18 - (r.rnk - 5);
        ELSE v_points := 0;
        END IF;
        
        INSERT INTO public.athlete_leg_points (athlete_id, leg_id, points, rank, virtual_km)
        VALUES (r.id, p_leg_id, v_points, r.rnk, r.vkm)
        ON CONFLICT (athlete_id, leg_id) DO UPDATE 
        SET points = v_points, rank = r.rnk, virtual_km = r.vkm;
    END LOOP;
END;
$$;
