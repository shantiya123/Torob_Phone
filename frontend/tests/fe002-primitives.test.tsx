import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  NumberDisplay,
  PriceDisplay,
} from "@/components/ui";

describe("FE002 shared primitives", () => {
  it("keeps loading buttons disabled and announces busy state", () => {
    render(<Button loading>پرداخت</Button>);
    const button = screen.getByRole("button", { name: "در حال پردازش…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("associates field labels and errors", () => {
    render(
      <Field>
        <FieldLabel htmlFor="phone">مدل</FieldLabel>
        <Input id="phone" aria-describedby="phone-error" />
        <FieldError id="phone-error">مدل الزامی است</FieldError>
      </Field>,
    );
    expect(screen.getByLabelText("مدل")).toHaveAttribute("aria-describedby", "phone-error");
    expect(screen.getByRole("alert")).toHaveTextContent("مدل الزامی است");
  });

  it("renders numeric values with bidi isolation", () => {
    const { container } = render(
      <>
        <NumberDisplay value={1250} />
        <PriceDisplay value={9900} />
      </>,
    );
    expect(container.querySelectorAll("[dir='ltr']").length).toBe(2);
    expect(container.textContent).toContain("\u2068");
  });
});
