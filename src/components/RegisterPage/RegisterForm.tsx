type RegisterForm = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
  avatar_url: string | null;
  date_of_birth: Date | null;
};
export default RegisterForm