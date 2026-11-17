import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { configSchema, type Config } from "../lib/model";
import { defaultConfig } from "../lib/fixtures";
import {
  ProductCard,
  InventoryTable,
  PeopleList,
  Empty,
  ErrorState,
  Loading,
} from "./Components";
import "./preview.css";
function Frame() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const token = useRef("");
  useEffect(() => {
    function receive(e: MessageEvent) {
      if (
        e.source !== window.parent ||
        e.origin !== location.origin ||
        e.data?.channel !== "statelab:config" ||
        typeof e.data.token !== "string"
      )
        return;
      const result = configSchema.safeParse(e.data.config);
      if (result.success) {
        token.current = e.data.token;
        setConfig(result.data);
      }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ channel: "statelab:ready" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = config.theme;
    document.documentElement.style.fontSize = `${config.textScale}%`;
    document.documentElement.dir = config.direction;
  }, [config.theme, config.textScale, config.direction]);
  useEffect(() => {
    let raf = 0;
    function measure() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const controls = [
          ...document.querySelectorAll("button,input,select,a[href]"),
        ].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const report = {
          overflow:
            document.documentElement.scrollWidth > window.innerWidth + 2,
          scrollRegions: [...document.querySelectorAll("*")].filter(
            (el) =>
              el.scrollWidth > el.clientWidth + 2 &&
              ["auto", "scroll"].includes(getComputedStyle(el).overflowX),
          ).length,
          smallTargets: controls.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 24 || r.height < 24;
          }).length,
          height: Math.max(document.body.scrollHeight, 320),
        };
        window.parent.postMessage(
          { channel: "statelab:report", token: token.current, report },
          location.origin,
        );
      });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [config]);
  function action(action: "retry" | "restore") {
    window.parent.postMessage(
      { channel: "statelab:action", token: token.current, action },
      location.origin,
    );
  }
  const noData =
    config.component === "people"
      ? !config.data.people.length
      : !config.data.products.length;
  return (
    <main className={`demo-stage stage-${config.component}`}>
      <div className="demo-context">
        <span>
          FORMA<span className="forma-dot">.</span>
        </span>
        <small>
          {config.component === "people"
            ? "A SPACE FOR GOOD COMPANY"
            : "OBJECTS FOR EVERYDAY LIVING"}
        </small>
      </div>
      <div className="demo-frame">
        {config.state === "loading" ? (
          <Loading kind={config.component} />
        ) : config.state === "error" ? (
          <ErrorState
            onRetry={() => action("retry")}
            live={config.errorSource === "live"}
          />
        ) : config.state === "empty" || noData ? (
          <Empty kind={config.component} onReset={() => action("restore")} />
        ) : config.component === "product" ? (
          <ProductCard config={config} />
        ) : config.component === "table" ? (
          <InventoryTable config={config} />
        ) : (
          <PeopleList config={config} />
        )}
      </div>
      <p className="demo-disclaimer">
        A real component. A fictional brand. Your edge cases.
      </p>
    </main>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Frame />
  </React.StrictMode>,
);
