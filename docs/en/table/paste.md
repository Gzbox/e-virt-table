# Copy and Paste

Pasting requires enabling the selector and keyboard

## Config

| Parameter                     | Description                    | Type     | Default Value |
| ------------------------ | ----------------------- | -------  | ------ |
| ENABLE_COPY | Enable Copy | boolean  | true |
| ENABLE_PASTER | Enable Paste | boolean  | true |
| BEFORE_PASTE_CHANGE_METHOD | Callback before paste | ^[Function]`(BeforeChangeParams[])=>BeforeChangeParams[]\|Promise<BeforeChangeParams[]>` | — |

## Typings

``` ts
type BeforeChangeParams = {
    rowKey: string;
    key: string;
    value: any;
    oldValue: any;
    row: any;
};
```

## Disable

- Enable selector
- Enable keyboard `ENABLE_KEYBOARD`, default true
- Enable copy `ENABLE_COPY`, default true
- Enable paste `ENABLE_PASTER`, default true
::: demo
paste/disabled
h:320px
:::

## Enable

- Enable selector
- Enable keyboard `ENABLE_KEYBOARD`, default true
- Enable copy `ENABLE_COPY`, default true
- Enable paste `ENABLE_PASTER`, default true
::: demo
paste/enable
h:320px
:::

## Before Paste Data Change

- BEFORE_AUTOFILL_CHANGE_METHOD can modify paste data, supports Promise

::: demo
paste/before-change
h:320px
:::
