import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "kairos.accessToken";
const REFRESH_TOKEN_KEY = "kairos.refreshToken";
const USER_KEY = "kairos.user";
const EXPO_PUSH_TOKEN_KEY = "kairos.expoPushToken";

export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveUser(userJson: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

export async function getUser(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function setExpoPushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
}

export async function getExpoPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(EXPO_PUSH_TOKEN_KEY);
}
