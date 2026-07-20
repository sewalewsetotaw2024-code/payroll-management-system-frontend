import { call, put, takeLatest } from 'redux-saga/effects';
import { notificationActions } from './notificationSlice';
import { notificationsApi } from '../../../api/notifications';

function* fetchNotificationsSaga(): Generator {
  try {
    const response: any = yield call(notificationsApi.fetchNotifications);
    yield put(notificationActions.fetchNotificationsSuccess(response.data));
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to fetch notifications';
    yield put(notificationActions.fetchNotificationsFailure(message));
  }
}

function* fetchUnreadCountSaga(): Generator {
  try {
    const count: any = yield call(notificationsApi.fetchUnreadCount);
    yield put(notificationActions.fetchUnreadCountSuccess(count));
  } catch (error: any) {
    // Silently fail for count updates - non-critical
    console.warn('[Notifications] Failed to fetch unread count:', error);
  }
}

function* markAsReadSaga(action: any): Generator {
  try {
    yield call(notificationsApi.markAsRead, action.payload);
    yield put(notificationActions.markAsReadSuccess(action.payload));
  } catch (error: any) {
    console.warn('[Notifications] Failed to mark as read:', error);
    // Optimistically update UI even if API fails
    yield put(notificationActions.markAsReadSuccess(action.payload));
  }
}

function* markAllAsReadSaga(): Generator {
  try {
    yield call(notificationsApi.markAllAsRead);
    yield put(notificationActions.markAllAsReadSuccess());
  } catch (error: any) {
    console.warn('[Notifications] Failed to mark all as read:', error);
    // Optimistically update UI even if API fails
    yield put(notificationActions.markAllAsReadSuccess());
  }
}

export default function* notificationSaga() {
  yield takeLatest(notificationActions.fetchNotificationsRequest.type, fetchNotificationsSaga);
  yield takeLatest(notificationActions.fetchUnreadCountRequest.type, fetchUnreadCountSaga);
  yield takeLatest(notificationActions.markAsRead.type, markAsReadSaga);
  yield takeLatest(notificationActions.markAllAsRead.type, markAllAsReadSaga);
}
