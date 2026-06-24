export const EVENT_NAMES = {
  logIn: 'jr_log_in',
  signUp: 'jr_Sign_Up',
  preLoginButton1: 'jr_pre_login_button_1',
  preLoginButton2: 'jr_pre_login_button_2',
  addToCart: 'jr_Add_To_Cart',
  removeFromCart: 'jr_Remove_from_Cart',
  orderPlaced: 'jr_order_placed',
  viewCart: 'jr_view_cart',
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

export const EVENT_PROPERTY_SCHEMAS: Record<
  CommerceEventName,
  EventPropertyDef[]
> = {
  [EVENT_NAMES.addToCart]: [
    { key: 'latest-cart-value', label: 'latest-cart-value', keyboardType: 'numeric' },
    { key: 'productCategory', label: 'productCategory' },
    { key: 'productId', label: 'productId' },
    { key: 'product-value', label: 'product-value', keyboardType: 'numeric' },
    { key: 'item-name', label: 'item-name' },
    { key: 'price', label: 'price', keyboardType: 'numeric' },
    { key: 'mrp', label: 'mrp', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.removeFromCart]: [
    { key: 'latest-cart-value', label: 'latest-cart-value', keyboardType: 'numeric' },
    { key: 'productCategory', label: 'productCategory' },
    { key: 'productId', label: 'productId' },
    { key: 'product-value', label: 'product-value', keyboardType: 'numeric' },
    { key: 'item-name', label: 'item-name' },
    { key: 'price', label: 'price', keyboardType: 'numeric' },
    { key: 'mrp', label: 'mrp', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.orderPlaced]: [
    { key: 'orderId', label: 'orderId' },
    { key: 'latest-cart-value', label: 'latest-cart-value', keyboardType: 'numeric' },
  ],
  [EVENT_NAMES.viewCart]: [
    { key: 'latest-cart-value', label: 'latest-cart-value', keyboardType: 'numeric' },
    { key: 'productCategory', label: 'productCategory' },
    { key: 'productId', label: 'productId' },
    { key: 'product-value', label: 'product-value', keyboardType: 'numeric' },
    { key: 'item-name', label: 'item-name' },
  ],
};
