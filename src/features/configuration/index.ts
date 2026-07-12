/**
 * Configuration feature barrel export.
 * Re-exports the ConfigurationPage, API, types, slice actions, and reducer.
 */
export { ConfigurationPage as Configuration } from './pages/ConfigurationPage';
export * from './api/configurationApi';
export * from './types/configuration.types';
export { configurationActions } from './store/configurationSlice';
export { default as configurationReducer } from './store/configurationSlice';
