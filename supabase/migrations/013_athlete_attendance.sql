-- Create athlete_attendance table
CREATE TABLE IF NOT EXISTS public.athlete_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_present BOOLEAN DEFAULT false,
    distance_km NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(athlete_id, date)
);

-- RLS Policies
ALTER TABLE public.athlete_attendance ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own attendance
CREATE POLICY "Athletes can view own attendance" ON public.athlete_attendance
    FOR SELECT USING (
        athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid())
    );

-- Athletes can insert/update their own attendance
CREATE POLICY "Athletes can insert own attendance" ON public.athlete_attendance
    FOR INSERT WITH CHECK (
        athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid())
    );

CREATE POLICY "Athletes can update own attendance" ON public.athlete_attendance
    FOR UPDATE USING (
        athlete_id IN (SELECT id FROM public.athletes WHERE user_id = auth.uid())
    );

-- Coaches can view attendance of athletes assigned to them
CREATE POLICY "Coaches can view team attendance" ON public.athlete_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.athletes a
            WHERE a.id = athlete_attendance.athlete_id
            AND a.coach_id = (SELECT id FROM public.coaches WHERE user_id = auth.uid())
        )
    );
