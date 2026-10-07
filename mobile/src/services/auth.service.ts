import { apiClient, tokenStorage } from './api';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponseDto,
  UpdateProfileDto,
} from '../../../packages/shared/src';

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const { data } = await apiClient.post<AuthResponseDto>('/auth/register', dto);
    await tokenStorage.setToken(data.accessToken);
    return data;
  },

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { data } = await apiClient.post<AuthResponseDto>('/auth/login', dto);
    await tokenStorage.setToken(data.accessToken);
    return data;
  },

  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    const { data } = await apiClient.post<AuthResponseDto>('/auth/google', dto);
    await tokenStorage.setToken(data.accessToken);
    return data;
  },

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean; message: string; devCode?: string }> {
    const { data } = await apiClient.post('/auth/forgot-password', dto);
    return data;
  },

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post('/auth/reset-password', dto);
    return data;
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  async updateProfile(dto: UpdateProfileDto) {
    const { data } = await apiClient.put('/auth/profile', dto);
    return data;
  },

  async updatePhone(phoneNumber: string) {
    const { data } = await apiClient.put('/auth/phone', { phoneNumber });
    return data;
  },

  async logout(): Promise<void> {
    await tokenStorage.clearToken();
  },
};
