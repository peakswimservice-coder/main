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
-- In this app, the athlete's id IS the auth.uid()
CREATE POLICY "Athletes can view own attendance" ON public.athlete_attendance
    FOR SELECT USING (
        athlete_id = auth.uid()
    );

-- Athletes can insert their own attendance
CREATE POLICY "Athletes can insert own attendance" ON public.athlete_attendance
    FOR INSERT WITH CHECK (
        athlete_id = auth.uid()
    );

-- Athletes can update their own attendance
CREATE POLICY "Athletes can update own attendance" ON public.athlete_attendance
    FOR UPDATE USING (
        athlete_id = auth.uid()
    );

-- Coaches can view attendance of athletes assigned to them
-- Coaches are identified by email matching auth.email()
CREATE POLICY "Coaches can view team attendance" ON public.athlete_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.athletes a
            JOIN public.coaches c ON c.id = a.coach_id
            WHERE a.id = athlete_attendance.athlete_id
            AND c.email = auth.email()
        )
    );
