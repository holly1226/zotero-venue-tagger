(() => {
  const data = window.arguments?.[0] || {};

  function selectedIDs() {
    return [...document.querySelectorAll("#source-list checkbox")]
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.getAttribute("value"));
  }

  function finish(action) {
    data.result = { action, selected: selectedIDs() };
    window.close();
  }

  window.addEventListener("load", () => {
    document.title = data.title || "HCI Venue Tagger";
    document.getElementById("picker-title").value = data.title || "HCI Venue Tagger";
    document.getElementById("picker-description").textContent = data.description || "";
    const selected = new Set(data.selected || []);
    const list = document.getElementById("source-list");
    for (const source of data.sources || []) {
      const checkbox = document.createXULElement("checkbox");
      checkbox.setAttribute("label", source.label);
      checkbox.setAttribute("value", source.id);
      checkbox.checked = selected.has(source.id);
      checkbox.style.margin = "6px 2px";
      checkbox.addEventListener("command", () => {
        document.getElementById("validation-message").value = "";
      });
      list.appendChild(checkbox);
    }

    const root = document.documentElement;
    root.getButton("accept").label = data.acceptLabel || "Continue";
    root.getButton("cancel").label = data.cancelLabel || "Cancel";
    const importButton = document.getElementById("import-button");
    importButton.label = data.importLabel || "Import CSV";
    importButton.addEventListener("command", () => finish("import"));
    const templateButton = document.getElementById("template-button");
    templateButton.label = data.templateLabel || "Download example";
    templateButton.addEventListener("command", () => finish("template"));

    root.addEventListener("dialogaccept", event => {
      const selected = selectedIDs();
      if (!selected.length) {
        event.preventDefault();
        document.getElementById("validation-message").value = data.validationMessage || "Select at least one list.";
        return;
      }
      data.result = { action: "accept", selected };
    });
    root.addEventListener("dialogcancel", () => {
      data.result = { action: "cancel", selected: selectedIDs() };
    });
    window.sizeToContent();
  });
})();
