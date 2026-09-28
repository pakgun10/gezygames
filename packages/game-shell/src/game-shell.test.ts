import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLATFORM_VERSION,
  renderGameHud,
  renderPlatformVersion,
  renderSessionDialogs,
} from "./index";

describe("game shell markup", () => {
  it("menampilkan statistik dan seluruh aksi HUD", () => {
    const markup = renderGameHud({
      brandHref: "/",
      soundEnabled: false,
      stats: [{ id: "score", icon: "⭐", label: "Skor", value: "120" }],
    });

    assert.match(markup, /id="score">120/);
    assert.match(markup, /id="sound-button"/);
    assert.match(markup, /id="help-button"/);
    assert.match(markup, /id="fullscreen-button"/);
    assert.match(markup, /id="pause-button"/);
    assert.match(markup, /Nyalakan suara/);
  });

  it("menampilkan bantuan sentuh dan keyboard dengan teks aman", () => {
    const markup = renderSessionDialogs({
      gameName: "Archer <uji>",
      helpItems: [{ icon: "👆", title: "Sentuh", detail: "Pilih target" }],
    });

    assert.match(markup, /Sentuh/);
    assert.match(markup, /Tombol angka/);
    assert.match(markup, /Jeda cepat/);
    assert.match(markup, /Archer &lt;uji&gt;/);
    assert.doesNotMatch(markup, /Archer <uji>/);
  });

  it("menampilkan versi platform pada footer", () => {
    assert.equal(PLATFORM_VERSION, "1.2.0");
    assert.match(renderPlatformVersion(), /Version : 1\.2\.0/);
  });
});
