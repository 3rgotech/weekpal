/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

/**
 * HeroUI, standing in as the plain elements it wraps.
 *
 * Two reasons this exists rather than the real package. HeroUI 3 ships ESM only, with an `exports`
 * map that offers no `require` condition, so jest cannot even resolve it — and the components are
 * built on react-aria, which wants layout and pointer behaviour jsdom does not have. What these
 * tests cover is our own wiring: which item an action applies to, and what it hands back. The real
 * components are exercised by the browser suite in `weekpal-api/tests/Browser`.
 *
 * `jest.config.js` maps `@heroui/react` here, so there is one stand-in rather than a factory
 * inlined in each test file — which is how the three of them drifted apart in the first place.
 */

type P = Record<string, any>;

const box = (tag: keyof React.JSX.IntrinsicElements = "div") =>
    ({ children, ...props }: P) => React.createElement(tag, filter(props), children);

/** react-aria props that are meaningless on a plain DOM node, and warn if passed through. */
const filter = ({
    onPress, onAction, onOpenChange, onChange, isOpen, isSelected, isDisabled, isRequired,
    isDismissable, isInvisible, state, variant, status, color, size, placement, showArrow,
    closeDelay, textValue, value, selectionMode, defaultOpen, placeholder, scroll, fullWidth,
    ...rest
}: P) => rest;

const pressable = ({ children, onPress, onAction, ...props }: P) => (
    <button onClick={onPress ?? onAction} {...filter(props)}>{children}</button>
);

const compound = <T extends P>(base: any, parts: T): typeof base & T =>
    Object.assign(base, parts);

export const Button = pressable;
export const ButtonGroup = box();
export const Spinner = () => <div>spinner</div>;
export const Label = box("span");
/** A section heading. React-aria's collections only recognise this, not a Label. */
export const Header = box("span");
export const Description = box("span");
export const Separator = () => <hr />;

export const Chip = compound(box("span"), { Label: box("span") });

export const Badge = compound(box("span"), {
    Label: box("span"),
    Anchor: box("span"),
});

export const Alert = compound(box(), {
    Indicator: box("span"),
    Content: box(),
    Title: box("p"),
    Description: box("span"),
});

export const Tooltip = compound(({ children }: P) => <>{children}</>, {
    Trigger: ({ children }: P) => <>{children}</>,
    Content: box("span"),
    Arrow: () => null,
});

export const Dropdown = compound(box(), {
    // A button, as v3's renders: the row's ⋮ is reached by role, not by hunting for a div.
    Trigger: box("button"),
    Popover: box(),
    Menu: box(),
    Section: box(),
    Item: pressable,
    ItemIndicator: () => null,
});

export const ListBox = compound(box("ul"), {
    Item: pressable,
    Section: box("li"),
    ItemIndicator: () => null,
});

export const Select = compound(box(), {
    Trigger: box(),
    Value: box("span"),
    Indicator: () => null,
    Popover: box(),
});

/** Open when told so directly, or by the overlay state a caller passed instead. */
export const Modal = compound(
    ({ children, isOpen, state }: P) => ((isOpen ?? state?.isOpen) ? <div>{children}</div> : null),
    {
        Backdrop: box(),
        Container: box(),
        // The dialog takes a render prop in v3, where v2 put one on ModalContent.
        Dialog: ({ children, ...props }: P) => (
            <div {...filter(props)}>
                {typeof children === "function" ? children({ close: () => undefined }) : children}
            </div>
        ),
        Header: box(),
        Heading: box("h2"),
        Body: box(),
        Footer: box(),
        CloseTrigger: () => null,
        Icon: box("span"),
    },
);

export const Tabs = compound(box(), {
    List: box(),
    ListContainer: box(),
    Tab: box("button"),
    Panel: box(),
    Indicator: () => null,
    Separator: () => null,
});

/**
 * The field's own props reach the control inside it, as react-aria's does — the label especially.
 * Left on the wrapper, `getByLabelText` returns the `<div>` and every `fireEvent.change` against
 * it fails with "the given element does not have a value setter".
 */
export const TextField = ({ children, value, onChange, onKeyDown, className, ...props }: P) => (
    <div className={className}>
        {React.Children.map(children, (child) =>
            React.isValidElement(child)
                ? React.cloneElement(child as React.ReactElement<P>, { value, onChange, onKeyDown, ...props })
                : child,
        )}
    </div>
);

/**
 * `isDisabled` becomes the DOM's own `disabled`, as react-aria does it.
 *
 * Left to {@link filter} the prop is dropped, and a control the real library would have disabled
 * renders here as an ordinary editable one — so a test asserting that a paid field is locked
 * passes against markup where it never was.
 */
export const Input = ({ value, onChange, isDisabled, ...props }: P) => (
    <input
        value={value ?? ""}
        disabled={isDisabled === true}
        onChange={(event) => onChange?.(event.target.value)}
        {...filter(props)}
    />
);

export const TextArea = ({ value, onChange, isDisabled, ...props }: P) => (
    <textarea
        value={value ?? ""}
        disabled={isDisabled === true}
        onChange={(event) => onChange?.(event.target.value)}
        {...filter(props)}
    />
);

export const Checkbox = compound(
    // `children` is dropped rather than spread: they are the Control and Indicator parts, and an
    // <input> is a void element that React refuses to give children to.
    ({ isSelected, onChange, children, ...props }: P) => (
        <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={(event) => onChange?.(event.target.checked)}
            {...filter(props)}
        />
    ),
    { Control: () => null, Indicator: () => null, Content: box("span") },
);

/**
 * Joins class names. The real one is tailwind-merge aware and drops the losing side of a
 * conflicting pair; nothing here asserts on merged classes, so plain concatenation is enough.
 */
export const cn = (...parts: unknown[]) => parts.filter(Boolean).join(" ");

/** The class list a component would have produced, which nothing here renders anyway. */
export const buttonVariants = (options: P = {}) =>
    ["button", options.size && `button--${options.size}`, options.variant && `button--${options.variant}`]
        .filter(Boolean)
        .join(" ");

export const useOverlayState = () => {
    const [isOpen, setOpen] = React.useState(false);

    return {
        isOpen,
        setOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        toggle: () => setOpen((previous) => !previous),
    };
};
