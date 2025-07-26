#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivity, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSString *)driverName
                  rating:(NSString *)rating
                  duration:(NSInteger)duration
                  progress:(double)progress)

RCT_EXTERN_METHOD(updateActivity:(NSString *)driverName
                  rating:(NSString *)rating
                  duration:(NSInteger)duration
                  progress:(double)progress)

RCT_EXTERN_METHOD(endActivity)

@end
