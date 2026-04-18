import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders navigation", () => {
    render(
      <MemoryRouter initialEntries={["/__test_no_page__"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Sponsors")).toBeInTheDocument();
  });
});
