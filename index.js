import { AppRegistry } from 'react-native';
import App from './App'; // ⬅️ ROOT
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
