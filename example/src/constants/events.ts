export const EVENT_NAMES = {
  logIn: 'jr_log_in',
  signUp: 'jr_Sign_Up',
  preLoginButton1: 'jr_pre_login_button_1',
  preLoginButton2: 'jr_pre_login_button_2',
  addToCart: 'Managed_add_to_cart',
  removeFromCart: 'Managed_remove_from_cart',
  orderPlaced: 'jr_order_placed',
  viewCart: 'Managed_view_cart',
} as const;

/** SDK automatic lifecycle events — fired by initSdk / OnUserLogin, not manually. */
export const SDK_LIFECYCLE_EVENTS = {
  appInstall: 'app_install',
  appLaunch: 'app_launch',
  appOpen: 'app_open',
} as const;

export type CommerceEventName =
  | typeof EVENT_NAMES.addToCart
  | typeof EVENT_NAMES.removeFromCart
  | typeof EVENT_NAMES.orderPlaced
  | typeof EVENT_NAMES.viewCart;

export const MANUAL_EVENT_OPTIONS: CommerceEventName[] = [
  EVENT_NAMES.addToCart,
  EVENT_NAMES.removeFromCart,
  EVENT_NAMES.orderPlaced,
  EVENT_NAMES.viewCart,
];

export type EventPropertyDef = {
  key: string;
  label: string;
  keyboardType?: 'default' | 'numeric';
};

/** Form fields use managed-events allowed keys (managed-events-sdk.md). */
export const EVENT_PROPERTY_SCHEMAS: Record<
  CommerceEventName,
  EventPropertyDef[]
> = {
  [EVENT_NAMES.addToCart]: [
    { key: 'item_id', label: 'item_id' },
    { key: 'item_name', label: 'item_name' },
    { key: 'item_brand', label: 'item_brand' },
    { key: 'item_category', label: 'item_category' },
    { key: 'price', label: 'price', keyboardType: 'numeric' },
    { key: 'original_price', label: 'original_price', keyboardType: 'numeric' },
    { key: 'quantity', label: 'quantity', keyboardType: 'numeric' },
    { key: 'value', label: 'value (cart total)', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.removeFromCart]: [
    { key: 'item_id', label: 'item_id' },
    { key: 'quantity', label: 'quantity (0 = DELETE line)', keyboardType: 'numeric' },
    { key: 'value', label: 'value (cart total)', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.orderPlaced]: [
    { key: 'order_id', label: 'order_id' },
    { key: 'value', label: 'value', keyboardType: 'numeric' },
    { key: 'item_id', label: 'item_id (line)' },
    { key: 'item_name', label: 'item_name (line)' },
    { key: 'item_brand', label: 'item_brand (line)' },
    { key: 'price', label: 'price (line)', keyboardType: 'numeric' },
    { key: 'quantity', label: 'quantity (line)', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.viewCart]: [
    { key: 'item_id', label: 'item_id' },
    { key: 'item_name', label: 'item_name' },
    { key: 'item_brand', label: 'item_brand' },
    { key: 'item_category', label: 'item_category' },
    { key: 'price', label: 'price', keyboardType: 'numeric' },
    { key: 'quantity', label: 'quantity', keyboardType: 'numeric' },
    { key: 'value', label: 'value (cart total)', keyboardType: 'numeric' },
  ],
};
