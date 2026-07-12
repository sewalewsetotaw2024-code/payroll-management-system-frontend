import { combineReducers } from '@reduxjs/toolkit';
import configurationReducer from '../features/configuration/store/configurationSlice';
import authReducer from '../features/auth/store/authSlice';
import notificationReducer from '../features/notifications/store/notificationSlice';

const rootReducer = combineReducers({
  configuration: configurationReducer,
  auth: authReducer,
  notifications: notificationReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
