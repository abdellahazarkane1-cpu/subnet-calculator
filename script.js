(function () {
  "use strict";

  const THEME_KEY = "subnet-calculator-theme";

  const form = document.getElementById("subnetForm");
  const ipInput = document.getElementById("ipAddress");
  const cidrInput = document.getElementById("cidr");
  const formError = document.getElementById("formError");
  const resultsSection = document.getElementById("resultsSection");
  const resultsSummary = document.getElementById("resultsSummary");
  const themeToggle = document.getElementById("themeToggle");

  const resultFields = {
    networkAddress: document.getElementById("networkAddress"),
    broadcastAddress: document.getElementById("broadcastAddress"),
    firstUsable: document.getElementById("firstUsable"),
    lastUsable: document.getElementById("lastUsable"),
    hostCount: document.getElementById("hostCount"),
  };

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  }

  function parseIPv4(ip) {
    const parts = ip.trim().split(".");
    if (parts.length !== 4) {
      return null;
    }

    const octets = parts.map((part) => {
      if (!/^\d{1,3}$/.test(part)) {
        return null;
      }
      const value = Number(part);
      if (value < 0 || value > 255) {
        return null;
      }
      return value;
    });

    if (octets.some((octet) => octet === null)) {
      return null;
    }

    return octets;
  }

  function octetsToInt(octets) {
    return (
      ((octets[0] << 24) >>> 0) |
      ((octets[1] << 16) >>> 0) |
      ((octets[2] << 8) >>> 0) |
      (octets[3] >>> 0)
    ) >>> 0;
  }

  function intToOctets(value) {
    return [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
  }

  function formatIPv4(value) {
    return intToOctets(value).join(".");
  }

  function formatHostCount(count) {
    return count.toLocaleString("en-US");
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
    resultsSection.hidden = true;
  }

  function clearError() {
    formError.textContent = "";
    formError.hidden = true;
  }

  function calculateSubnet(ip, cidr) {
    const octets = parseIPv4(ip);
    if (!octets) {
      throw new Error("Enter a valid IPv4 address (e.g. 192.168.1.10).");
    }

    if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
      throw new Error("CIDR must be a whole number between 0 and 32.");
    }

    const ipInt = octetsToInt(octets);
    const hostBits = 32 - cidr;

    if (hostBits === 32) {
      return {
        network: 0,
        broadcast: 0xffffffff,
        firstUsable: null,
        lastUsable: null,
        hostCount: 4294967296,
        cidr,
        ipInt,
      };
    }

    const mask = hostBits === 0 ? 0xffffffff : (~0 << hostBits) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const totalAddresses = Math.pow(2, hostBits);

    let firstUsable = null;
    let lastUsable = null;
    let hostCount = 0;

    if (hostBits === 0) {
      hostCount = 0;
    } else if (hostBits === 1) {
      hostCount = 0;
    } else {
      firstUsable = (network + 1) >>> 0;
      lastUsable = (broadcast - 1) >>> 0;
      hostCount = totalAddresses - 2;
    }

    return {
      network,
      broadcast,
      firstUsable,
      lastUsable,
      hostCount,
      cidr,
      ipInt,
    };
  }

  function displayResults(result, ip) {
    resultFields.networkAddress.textContent = formatIPv4(result.network);
    resultFields.broadcastAddress.textContent = formatIPv4(result.broadcast);

    if (result.firstUsable === null || result.lastUsable === null) {
      resultFields.firstUsable.textContent = "N/A";
      resultFields.lastUsable.textContent = "N/A";
    } else {
      resultFields.firstUsable.textContent = formatIPv4(result.firstUsable);
      resultFields.lastUsable.textContent = formatIPv4(result.lastUsable);
    }

    resultFields.hostCount.textContent = formatHostCount(result.hostCount);
    resultsSummary.textContent = `${ip.trim()} /${result.cidr}`;
    resultsSection.hidden = false;
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearError();

    const ip = ipInput.value;
    const cidr = Number(cidrInput.value);

    try {
      const result = calculateSubnet(ip, cidr);
      displayResults(result, ip);
    } catch (error) {
      showError(error.message);
    }
  }

  initTheme();
  themeToggle.addEventListener("click", toggleTheme);
  form.addEventListener("submit", handleSubmit);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (!localStorage.getItem(THEME_KEY)) {
      document.documentElement.setAttribute("data-theme", event.matches ? "dark" : "light");
    }
  });
})();
