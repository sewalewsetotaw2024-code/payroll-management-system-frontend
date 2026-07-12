import { all, fork } from 'redux-saga/effects';
import configurationSaga from '../features/configuration/store/configurationSaga';
import authSaga from '../features/auth/store/authSaga';

export default function* rootSaga() {
  yield all([
    fork(configurationSaga),
    fork(authSaga),
  ]);
}
