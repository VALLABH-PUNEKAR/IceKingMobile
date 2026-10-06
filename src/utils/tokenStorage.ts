import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_jwt_token';

// Save token securely
export const saveToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

// Retrieve token
export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

// Delete token (on logout)
export const removeToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  console.log("Token Deleted")
};