/**
 * Native iOS entry for the React Native app.
 * Wires Firebase (FCM) + notification center so JS push/Notifee can run.
 */
#import "AppDelegate.h"

#import <Firebase.h>
#import <React/RCTBundleURLProvider.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Must match app.json `name` / AppRegistry.registerComponent — otherwise JS never mounts.
  self.moduleName = @"KarinsFleet";
  self.initialProps = @{};

  // Configure Firebase before any messaging/token calls from the JS layer.
  [FIRApp configure];

  // Allow foreground notification presentation (Notifee + FCM banners).
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Show alerts while the app is in the foreground so operators still see fleet events.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  completionHandler(
    UNNotificationPresentationOptionSound |
    UNNotificationPresentationOptionBadge |
    UNNotificationPresentationOptionBanner |
    UNNotificationPresentationOptionList
  );
}

@end
