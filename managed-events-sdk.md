# Managed Events — SDK

For app / SDK integrators. Same event API as today. You add `event_data.ops` only on events that have an item list you want in cohorts (`placed_order`, `add_to_cart`, …).

`POST /pushapp/api/v1/event`  
Header: `x-device-id`

Without `ops`, the event is stored as usual and is not managed.

The server must have `mry.pushapp.managedEvents.store=true` (writes) and `mry.pushapp.managedEvents.read=true` (cohorts on managed objects). Missing = off.

## Op shape

```ts
{
  objectType: "ORDER" | "ORDER_ITEM" | "CART_ITEM",
  objectId?: string,
  objectOperation?: "PUT" | "MERGE" | "TRIM" | "DELETE" | "TRUNCATE",
  data?: object,
  fields?: string[]
}
```

| Rule        | Detail                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Field names | `objectType` and `objectOperation` only. No `type` / `operation`.                                                                         |
| Default op  | Omit `objectOperation` → `PUT`.                                                                                                           |
| Data        | Only `op.data` is written to the managed object. Top-level `event_data` (except `ops`) is the regular event payload.                      |
| `objectId`  | Optional. ORDER: `data.id` → `order_id` → `transaction_id` → `shopify_order_id`. ITEM: `data.id` → `item_id` → `sku`. `id` is not stored. |

## Place an order

One `ORDER` op is enough. `PUT` + `data.items[]` creates one line per item. Send `ORDER_ITEM` ops only to merge or delete a single line.

```json
{
  "event_name": "placed_order",
  "event_data": {
    "order_id": "ORD-123",
    "value": 250,
    "currency": "INR",
    "items": [
      { "item_id": "101", "item_brand": "Nike", "item_name": "Shoes" },
      { "item_id": "102", "item_brand": "Adidas", "item_name": "Socks" }
    ],
    "ops": [
      {
        "objectType": "ORDER",
        "data": {
          "order_id": "ORD-123",
          "value": 250,
          "currency": "INR",
          "items": [
            { "item_id": "101", "item_brand": "Nike", "item_name": "Shoes" },
            { "item_id": "102", "item_brand": "Adidas", "item_name": "Socks" }
          ]
        }
      }
    ]
  }
}
```

`ORDER` `PUT` / `MERGE` clears the cart.

## Cart

Send an `ops` entry on every cart event.

### Add / replace a line

```json
{
  "event_name": "add_to_cart",
  "event_data": {
    "item_id": "101",
    "item_brand": "Nike",
    "item_name": "Shoes",
    "ops": [
      {
        "objectType": "CART_ITEM",
        "data": {
          "item_id": "101",
          "item_brand": "Nike",
          "item_name": "Shoes"
        }
      }
    ]
  }
}
```

`objectId` is `101` from `data.item_id`.

### Remove a line

```json
{
  "event_name": "remove_from_cart",
  "event_data": {
    "item_id": "101",
    "ops": [
      {
        "objectType": "CART_ITEM",
        "objectOperation": "DELETE",
        "data": { "item_id": "101" }
      }
    ]
  }
}
```

`objectId` on the op is also fine instead of `data`.

### Empty the cart

```json
{
  "event_name": "cart_cleared",
  "event_data": {
    "ops": [{ "objectType": "CART_ITEM", "objectOperation": "TRUNCATE" }]
  }
}
```

## Allowed `data` keys

**ORDER:** `order_id`, `transaction_id`, `shopify_order_id`, `url`, `value`, `checkout_token`, `sub_total`, `discount`, `currency`, `coupon`, `items[]`

**Item** (`ORDER_ITEM` / `CART_ITEM`): `item_id`, `handle`, `item_name`, `item_variant`, `price`, `original_price`, `discount`, `url`, `sku`, `item_category`, `item_brand`, `img_url`, `quantity`

Other keys are dropped. Do not send `_order` — the server fills it on order lines.

## Other operations

```json
{
  "objectType": "ORDER",
  "objectOperation": "MERGE",
  "data": { "order_id": "ORD-123", "coupon": "SAVE10" }
}
```

```json
{
  "objectType": "CART_ITEM",
  "objectOperation": "TRIM",
  "data": { "item_id": "101" },
  "fields": ["img_url"]
}
```

If `fields` is omitted on `TRIM`, keys present on `data` are unset.

## Cohorts (what you are enabling)

Same event names in the dashboard.

```text
placed_order last 180d + value = 250
placed_order last 180d + items.item_brand = Nike
add_to_cart + item_brand = Nike
```

For “in cart now”, do not add a time window.
