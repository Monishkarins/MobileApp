/**
 * Side-effect module — registers the FCM background handler when Firebase is configured.
 */

import { registerBackgroundMessageHandler } from './messagingProvider';
import { handleBackgroundPush } from './pushService';

registerBackgroundMessageHandler(handleBackgroundPush);
