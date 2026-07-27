/**
 * @format
 */

import 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';
import './src/services/notifications/pushBackground';
import './src/services/notifications/notifeeBackground';

// Freeze inactive tab stacks so background screens stop re-rendering while scrolling.
enableScreens(true);
enableFreeze(true);

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
