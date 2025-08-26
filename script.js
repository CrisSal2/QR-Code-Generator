    // --- Utility helpers ---
    const lsKey = "qr_sheet_items_v1";

    function normalizeUrl(u) {
      try {
        // If user typed without protocol, assume https
        if (!/^https?:\/\//i.test(u)) u = "https://" + u;
        const url = new URL(u);
        return url.toString();
      } catch {
        return null;
      }
    }

    function loadItems() {
      try { return JSON.parse(localStorage.getItem(lsKey)) || []; }
      catch { return []; }
    }
    function saveItems(items) {
      localStorage.setItem(lsKey, JSON.stringify(items));
    }

    // --- App state ---
    let items = loadItems(); // [{id, title, url}]

    // --- DOM refs ---
    const form = document.getElementById("qrForm");
    const titleEl = document.getElementById("title");
    const urlEl = document.getElementById("url");
    const cardsEl = document.getElementById("cards");
    const printBtn = document.getElementById("printBtn");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const clearBtn = document.getElementById("clearBtn");

    // --- Render ---
    function render() {
      cardsEl.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("div");
        empty.style.color = "#9ca3af";
        empty.style.textAlign = "center";
        empty.style.padding = "24px";
        empty.textContent = "No QR codes yet. Add one above!";
        cardsEl.appendChild(empty);
        return;
      }

      for (const item of items) {
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("data-id", item.id);

        const h3 = document.createElement("div");
        h3.className = "title";
        h3.textContent = item.title || "(Untitled)";

        const p = document.createElement("div");
        p.className = "url";
        p.textContent = item.url;

        const qrWrap = document.createElement("div");
        qrWrap.className = "qr";
        const qrBox = document.createElement("div");
        qrWrap.appendChild(qrBox);

        // Generate QR
        // eslint-disable-next-line no-undef
        new QRCode(qrBox, {
          text: item.url,
          width: 512,
          height: 512,
          correctLevel: QRCode.CorrectLevel.M, // good balance for print
          colorDark: "#000000",
          colorLight: "#ffffff"
        });

        const footer = document.createElement("div");
        footer.className = "card-footer";

        const small = document.createElement("small");
        small.style.opacity = .7;
        small.textContent = "ID: " + item.id.slice(0, 8);

        const del = document.createElement("button");
        del.className = "btn small danger";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
          items = items.filter(x => x.id !== item.id);
          saveItems(items);
          render();
        });

        footer.appendChild(small);
        footer.appendChild(del);

        card.appendChild(h3);
        card.appendChild(p);
        card.appendChild(qrWrap);
        card.appendChild(footer);

        cardsEl.appendChild(card);
      }
    }

    // --- Events ---
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = (titleEl.value || "").trim();
      const rawUrl = (urlEl.value || "").trim();

      const url = normalizeUrl(rawUrl);
      if (!url) {
        alert("Please enter a valid URL (e.g., https://example.com).");
        urlEl.focus();
        return;
      }

      const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);

      items.unshift({ id, title, url });
      saveItems(items);
      render();

      form.reset();
      titleEl.focus();
    });

    printBtn.addEventListener("click", () => window.print());

    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qr-codes.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    importBtn.addEventListener("click", async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error("Bad format");
          // Basic sanity map
          const cleaned = parsed
            .map(x => ({ id: x.id || String(Date.now())+Math.random(), title: x.title || "", url: normalizeUrl(x.url) }))
            .filter(x => x.url);
          items = cleaned.concat(items); // prepend imported
          saveItems(items);
          render();
        } catch (err) {
          alert("Import failed. Make sure it's a JSON export from this tool.");
          console.error(err);
        }
      };
      input.click();
    });

    clearBtn.addEventListener("click", () => {
      if (confirm("Delete ALL saved QR codes? This cannot be undone.")) {
        items = [];
        saveItems(items);
        render();
      }
    });

    // Initial paint
    render();