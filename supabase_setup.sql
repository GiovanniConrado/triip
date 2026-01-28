-- EXECUTAR NO SQL EDITOR DO SUPABASE
-- Este script configura as permissões (RLS) necessárias para o funcionamento do Triip.

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_comments ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para TRIPS
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
CREATE POLICY "Users can create their own trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view trips they own or participate in" ON trips;
CREATE POLICY "Users can view trips they own or participate in" ON trips
    FOR SELECT USING (
        auth.uid() = user_id OR 
        id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update their trips" ON trips;
CREATE POLICY "Owners can update their trips" ON trips
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their trips" ON trips;
CREATE POLICY "Owners can delete their trips" ON trips
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Políticas para PARTICIPANTS
DROP POLICY IF EXISTS "Users can insert their own participant record" ON participants;
CREATE POLICY "Users can insert their own participant record" ON participants
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view participants of their trips" ON participants;
CREATE POLICY "Users can view participants of their trips" ON participants
    FOR SELECT USING (
        trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
        trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update participants" ON participants;
CREATE POLICY "Admins can update participants" ON participants
    FOR UPDATE USING (
        trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
        trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can delete participants" ON participants;
CREATE POLICY "Admins can delete participants" ON participants
    FOR DELETE USING (
        trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
        trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 4. Políticas para EXPENSES / SUGGESTIONS
DROP POLICY IF EXISTS "Participants can view expenses" ON expenses;
CREATE POLICY "Participants can view expenses" ON expenses
    FOR SELECT USING (trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Participants can insert expenses" ON expenses;
CREATE POLICY "Participants can insert expenses" ON expenses
    FOR INSERT WITH CHECK (trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Participants can view suggestions" ON suggestions;
CREATE POLICY "Participants can view suggestions" ON suggestions
    FOR SELECT USING (trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Participants can insert suggestions" ON suggestions;
CREATE POLICY "Participants can insert suggestions" ON suggestions
    FOR INSERT WITH CHECK (trip_id IN (SELECT trip_id FROM participants WHERE user_id = auth.uid()));
