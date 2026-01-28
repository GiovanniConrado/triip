-- OPÇÃO NUCLEAR: DESABILITAR RLS PARA TESTES
-- Execute este script no SQL Editor do Supabase para remover todas as restrições de segurança.
-- AVISO: Isso tornará seus dados públicos para qualquer pessoa com a chave anon.

ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Opcional: Limpar políticas existentes para não dar conflito no futuro
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they own or participate in" ON trips;
DROP POLICY IF EXISTS "Owners can update their trips" ON trips;
DROP POLICY IF EXISTS "Owners can delete their trips" ON trips;
DROP POLICY IF EXISTS "Users can insert their own participant record" ON participants;
DROP POLICY IF EXISTS "Users can view participants of their trips" ON participants;
DROP POLICY IF EXISTS "Admins can update participants" ON participants;
DROP POLICY IF EXISTS "Admins can delete participants" ON participants;
DROP POLICY IF EXISTS "Participants can view expenses" ON expenses;
DROP POLICY IF EXISTS "Participants can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Participants can view suggestions" ON suggestions;
DROP POLICY IF EXISTS "Participants can insert suggestions" ON suggestions;
