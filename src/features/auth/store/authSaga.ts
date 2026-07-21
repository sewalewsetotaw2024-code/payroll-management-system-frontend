import { call, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authActions } from './authSlice';
import { authApi } from '../api/authApi';
import type { LoginCredentials } from '../types/auth.types';
import { tokenStorage } from '../../../lib/token';

function* loginSaga(action: PayloadAction<LoginCredentials>): Generator {
  try {
    const response: any = yield call(authApi.login, action.payload);
    
    if (typeof response.data === 'string') {
      throw new Error("Invalid API response. Ensure API URL is configured correctly.");
    }

    const { token, data, user: directUser } = response.data;
    const user = data?.user || directUser;

    if (!user) {
      throw new Error("User data missing from response.");
    }

    const remember = action.payload.remember ?? false;
    tokenStorage.setToken(token, remember);
    yield put(authActions.loginSuccess({ user, token }));
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Login failed. Please check your credentials.';
    yield put(authActions.loginFailure(message));
  }
}

function* fetchMeSaga(): Generator {
  try {
    const response: any = yield call(authApi.fetchMe);
    
    if (typeof response.data === 'string') {
      throw new Error("Invalid API response format");
    }

    const user = response.data?.data?.user || response.data?.user;
    
    if (!user) {
      throw new Error("User data missing from response");
    }

    yield put(authActions.fetchMeSuccess(user));
  } catch (error: any) {
    tokenStorage.removeToken();
    yield put(authActions.fetchMeFailure('Session expired. Please login again.'));
  }
}

function* logoutSaga(): Generator {
  tokenStorage.removeToken();
}

export default function* authSaga() {
  yield takeLatest(authActions.loginRequest.type, loginSaga);
  yield takeLatest(authActions.fetchMeRequest.type, fetchMeSaga);
  yield takeLatest(authActions.logout.type, logoutSaga);
}
