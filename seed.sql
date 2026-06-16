-- 1. Confirm all existing users in the authentication table
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    last_sign_in_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Create the auto-confirm trigger for future sign-ups
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_auto_confirm_email
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_email();

-- 3. Backfill existing authenticated users into public.profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'User'), 
  COALESCE((raw_user_meta_data->>'role')::user_role, 'teacher'::user_role)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Create the automatic trigger to copy future sign-ups to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Seed the default classes into the classes table
INSERT INTO public.classes (name, section) VALUES
('Class 1', 'A'), ('Class 1', 'B'), ('Class 1', 'C'),
('Class 2', 'A'), ('Class 2', 'B'), ('Class 2', 'C'),
('Class 3', 'A'), ('Class 3', 'B'), ('Class 3', 'C'),
('Class 4', 'A'), ('Class 4', 'B'), ('Class 4', 'C'),
('Class 5', 'A'), ('Class 5', 'B'), ('Class 5', 'C'),
('Class 6', 'A'), ('Class 6', 'B'), ('Class 6', 'C'),
('Class 7', 'A'), ('Class 7', 'B'), ('Class 7', 'C'),
('Class 8', 'A'), ('Class 8', 'B'), ('Class 8', 'C'),
('Class 9', 'A'), ('Class 9', 'B'),
('Class 10', 'A'), ('Class 10', 'B')
ON CONFLICT DO NOTHING;
