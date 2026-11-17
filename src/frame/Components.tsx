import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowRight,
  Box,
  Check,
  ImageOff,
  Mail,
  MoreHorizontal,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";
import { type Config } from "../lib/model";
export function ProductCard({ config: c }: { config: Config }) {
  const [added, setAdded] = useState(false);
  const [failed, setFailed] = useState(false);
  const p = c.data.products[0];
  useEffect(() => {
    setAdded(false);
    setFailed(false);
  }, [c.data]);
  if (!p) return <Empty kind="product" />;
  const unavailable = p.stock === 0 || p.price === null;
  const price =
    p.price === null
      ? "Price on request"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: c.currency,
        }).format(p.price);
  return (
    <article className="product-card">
      <div className="product-visual">
        {p.image && !failed ? (
          <img
            src={p.image}
            alt={p.title || "Product photograph"}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="image-fallback">
            <ImageOff size={32} />
            <span>Image unavailable</span>
          </div>
        )}
        <span className="product-tag">
          {p.stock === 0 ? "Out of stock" : "Considered essentials"}
        </span>
      </div>
      <div className="product-content">
        <span className="product-category">
          {p.category || "Uncategorised"}
        </span>
        <h2 dir="auto">{p.title || "Untitled product"}</h2>
        <p dir="auto">
          {p.description ||
            "A description hasn’t been added yet. Check back for the details."}
        </p>
        <div className="product-price">
          <strong>{price}</strong>
          <span>
            {p.stock === null
              ? "Availability unknown"
              : p.stock === 0
                ? "Back soon"
                : `${p.stock.toLocaleString()} available`}
          </span>
        </div>
        <button
          className="demo-primary"
          disabled={unavailable}
          onClick={() => setAdded((s) => !s)}
        >
          {added ? <Check size={17} /> : <ShoppingBag size={17} />}{" "}
          {p.price === null
            ? "Pricing unavailable"
            : p.stock === 0
              ? "Currently unavailable"
              : added
                ? "Added · remove from bag"
                : "Add to bag"}
          {!unavailable && !added && <ArrowRight size={17} />}
        </button>
        <p className="product-footer" role="status">
          {added
            ? "Demo bag updated. No order was placed."
            : "A little less, but a little better."}
        </p>
      </div>
    </article>
  );
}
export function InventoryTable({ config: c }: { config: Config }) {
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setSelected([]);
    setSearch("");
  }, [c.data]);
  const rows = c.data.products
    .filter((p) =>
      p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title),
    );
  return (
    <section className="inventory-demo">
      <header>
        <div>
          <span className="demo-eyebrow">THE EVERYDAY COLLECTION</span>
          <h2>
            Inventory <span>{c.data.products.length}</span>
          </h2>
        </div>
        <span className="demo-pill">{selected.length} selected</span>
      </header>
      <label className="demo-search">
        <Search size={16} />
        <span className="sr-only">Search inventory</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
        />
      </label>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Scrollable inventory"
      >
        <table>
          <thead>
            <tr>
              <th>
                <span className="sr-only">Select</span>
              </th>
              <th>
                <button
                  onClick={() => setSort((s) => (s === "asc" ? "desc" : "asc"))}
                  aria-label={`Sort products ${sort === "asc" ? "descending" : "ascending"}`}
                >
                  Product{" "}
                  {sort === "asc" ? (
                    <ArrowUp size={13} />
                  ) : (
                    <ArrowDown size={13} />
                  )}
                </button>
              </th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className={selected.includes(p.id) ? "selected-row" : ""}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.title || "untitled product"}`}
                    checked={selected.includes(p.id)}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(p.id)
                          ? s.filter((x) => x !== p.id)
                          : [...s, p.id],
                      )
                    }
                  />
                </td>
                <td>
                  <div className="table-product">
                    <span className="table-product-icon">
                      <Box size={17} />
                    </span>
                    <span dir="auto">{p.title || "Untitled product"}</span>
                  </div>
                </td>
                <td dir="auto">{p.category || "Uncategorised"}</td>
                <td className="price-cell">
                  {p.price === null
                    ? "—"
                    : new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: c.currency,
                      }).format(p.price)}
                </td>
                <td>
                  <span
                    className={`stock-pill ${p.stock === 0 ? "unavailable" : ""}`}
                  >
                    {p.stock === null
                      ? "Unknown"
                      : p.stock === 0
                        ? "Out of stock"
                        : "In stock"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="no-search-results">
          <Search size={23} />
          <h3>No matching products</h3>
          <button className="demo-secondary" onClick={() => setSearch("")}>
            Clear search
          </button>
        </div>
      )}
      <footer>
        <span>
          {rows.length} product{rows.length === 1 ? "" : "s"}
        </span>
        <button onClick={() => setSelected([])} disabled={!selected.length}>
          Clear selection
        </button>
      </footer>
    </section>
  );
}
export function PeopleList({ config: c }: { config: Config }) {
  const [followed, setFollowed] = useState<string[]>([]);
  useEffect(() => setFollowed([]), [c.data]);
  return (
    <section className="people-demo">
      <header>
        <span className="demo-eyebrow">GOOD PEOPLE. GREAT WORK.</span>
        <h2>
          Your creative circle <span>{c.data.people.length}</span>
        </h2>
        <p>A few familiar faces, a world of different perspectives.</p>
      </header>
      <div className="people-list">
        {c.data.people.map((p) => (
          <article className="person" key={p.id}>
            <Avatar name={p.name} image={p.avatar} />
            <div className="person-text">
              <h3 dir="auto">{p.name || "Name unavailable"}</h3>
              <p dir="auto">{p.role || "Role not specified"}</p>
              <small dir="auto">
                {p.company || "Independent"} · {p.email || "Email not provided"}
              </small>
            </div>
            <button
              className={`follow-button ${followed.includes(p.id) ? "following" : ""}`}
              aria-pressed={followed.includes(p.id)}
              onClick={() =>
                setFollowed((s) =>
                  s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id],
                )
              }
            >
              {followed.includes(p.id) ? <Check size={14} /> : null}
              {followed.includes(p.id) ? "Following" : "Follow"}
            </button>
          </article>
        ))}
      </div>
      <footer>
        <Users size={14} />
        <span>Connections are local to this demo.</span>
      </footer>
    </section>
  );
}
function Avatar({ name, image }: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return (
    <div className="avatar">
      {image && !failed ? (
        <img src={image} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>
          {name.trim()
            ? name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => [...s][0])
                .join("")
            : "?"}
        </span>
      )}
    </div>
  );
}
export function Empty({
  kind,
  onReset,
}: {
  kind: Config["component"];
  onReset?: () => void;
}) {
  return (
    <div className="state-card empty-state">
      <span className="state-illustration">
        <PackageOpen size={36} />
      </span>
      <span className="demo-eyebrow">A LITTLE ROOM FOR SOMETHING NEW</span>
      <h2>
        {kind === "people"
          ? "Your circle starts here."
          : kind === "table"
            ? "Nothing on the shelves."
            : "A fresh collection is coming."}
      </h2>
      <p>
        {kind === "people"
          ? "There are no people in this list yet. Try a different dataset."
          : "No products match this state. Your next discovery is a new dataset away."}
      </p>
      <button className="demo-primary" onClick={onReset}>
        Restore sample data <ArrowRight size={16} />
      </button>
    </div>
  );
}
export function ErrorState({
  onRetry,
  live = false,
}: {
  onRetry: () => void;
  live?: boolean;
}) {
  return (
    <div className="state-card error-state" role="alert">
      <span className="state-illustration">
        <TriangleAlert size={32} />
      </span>
      <span className="demo-eyebrow">THAT DIDN’T GO TO PLAN</span>
      <h2>A small interruption.</h2>
      <p>
        We couldn’t load this collection. Your existing data is safe. Give it
        another try.
      </p>
      <button className="demo-primary" onClick={onRetry}>
        <RefreshCw size={15} /> Try again
      </button>
      <small>
        {live
          ? "Live request failed · previous data preserved"
          : "Simulated error · no real server failed"}
      </small>
    </div>
  );
}
export function Loading({ kind }: { kind: Config["component"] }) {
  return (
    <div
      className={`loading-demo ${kind === "product" ? "loading-product" : ""}`}
      role="status"
      aria-label="Loading component"
    >
      <div className="skeleton sk-image" />
      {[0, 1, 2].map((i) => (
        <div className="skeleton sk-line" key={i} />
      ))}
      <div className="skeleton sk-button" />
      <span className="sr-only">Loading preview content…</span>
    </div>
  );
}
