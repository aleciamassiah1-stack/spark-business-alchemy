import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { WillData } from "./will-builder.functions";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 64;

export async function generateWillPdf(d: WillData, state: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const wrap = (text: string, font = serif, size = 11, maxWidth = PAGE_W - MARGIN * 2) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const draw = (text: string, opts: { font?: typeof serif; size?: number; gap?: number; indent?: number } = {}) => {
    const font = opts.font ?? serif;
    const size = opts.size ?? 11;
    const gap = opts.gap ?? 4;
    const indent = opts.indent ?? 0;
    const lines = wrap(text, font, size, PAGE_W - MARGIN * 2 - indent);
    for (const line of lines) {
      if (y < MARGIN + size + 20) newPage();
      page.drawText(line, { x: MARGIN + indent, y, size, font, color: rgb(0.08, 0.08, 0.1) });
      y -= size + gap;
    }
  };

  const heading = (text: string) => {
    y -= 8;
    if (y < MARGIN + 40) newPage();
    draw(text, { font: serifBold, size: 13, gap: 6 });
  };

  const para = (text: string) => draw(text, { gap: 4 });
  const spacer = (h = 10) => {
    y -= h;
  };

  const t = d.testator ?? {};
  const fullName = (t.fullName || "[FULL LEGAL NAME]").toUpperCase();
  const addr = [t.address, t.city, t.state || state, t.zip].filter(Boolean).join(", ") || "[ADDRESS]";

  // Title
  page.drawText("LAST WILL AND TESTAMENT", {
    x: (PAGE_W - serifBold.widthOfTextAtSize("LAST WILL AND TESTAMENT", 20)) / 2,
    y,
    size: 20,
    font: serifBold,
  });
  y -= 28;
  const sub = `OF ${fullName}`;
  page.drawText(sub, {
    x: (PAGE_W - serifBold.widthOfTextAtSize(sub, 14)) / 2,
    y,
    size: 14,
    font: serifBold,
  });
  y -= 30;

  // Preamble
  para(
    `I, ${fullName}, of ${addr}, being of sound mind and memory, and not acting under duress or undue influence, do hereby make, publish, and declare this to be my Last Will and Testament, hereby revoking all wills and codicils previously made by me.`,
  );

  // Family
  heading("ARTICLE I — FAMILY");
  if (t.maritalStatus === "married" && t.spouseName) {
    para(`I am married to ${t.spouseName}, hereinafter referred to as "my spouse."`);
  } else if (t.maritalStatus) {
    para(`My marital status at the time of executing this Will is: ${t.maritalStatus}.`);
  }
  const kids = d.guardian?.children?.filter((c) => c.name?.trim()) ?? [];
  if (kids.length > 0) {
    para(`I have the following child${kids.length > 1 ? "ren" : ""}:`);
    kids.forEach((c, i) =>
      para(`   ${i + 1}. ${c.name}${c.dob ? ` (born ${c.dob})` : ""}`),
    );
  }

  // Executor
  heading("ARTICLE II — APPOINTMENT OF EXECUTOR");
  const ex = d.executor ?? {};
  para(
    `I nominate and appoint ${ex.name || "[EXECUTOR NAME]"}${ex.relation ? `, my ${ex.relation}` : ""}, to serve as the Executor of this Will. If ${ex.name || "the foregoing Executor"} is unable or unwilling to serve, I nominate ${ex.alternateName || "[ALTERNATE EXECUTOR]"}${ex.alternateRelation ? `, my ${ex.alternateRelation}` : ""}, to serve as alternate Executor. I direct that no bond or other security shall be required of any Executor named herein.`,
  );

  // Guardian
  if (d.guardian?.hasMinorChildren) {
    heading("ARTICLE III — GUARDIAN FOR MINOR CHILDREN");
    para(
      `If at the time of my death any of my children are minors, I nominate ${d.guardian.primaryName || "[GUARDIAN NAME]"}${d.guardian.primaryRelation ? `, my ${d.guardian.primaryRelation}` : ""}, as Guardian of the person and estate of such minor children. If the foregoing Guardian is unable or unwilling to serve, I nominate ${d.guardian.alternateName || "[ALTERNATE GUARDIAN]"} to serve as alternate Guardian.`,
    );
  }

  // Specific bequests
  const bequests = (d.specificBequests ?? []).filter((b) => b.item?.trim() && b.recipient?.trim());
  if (bequests.length > 0) {
    heading("ARTICLE IV — SPECIFIC BEQUESTS");
    para("I give, devise and bequeath the following specific bequests:");
    bequests.forEach((b, i) =>
      para(`   ${i + 1}. To ${b.recipient}: ${b.item}.`),
    );
  }

  // Pets
  const pets = (d.pets ?? []).filter((p) => p.name?.trim());
  if (pets.length > 0) {
    heading("ARTICLE V — CARE OF PETS");
    pets.forEach((p) =>
      para(
        `I give my pet ${p.name} to ${p.caretakerName || "[CARETAKER]"}, together with the sum of $${(p.fundAmount ?? 0).toLocaleString()} to be used for its care and maintenance.`,
      ),
    );
  }

  // Residuary
  heading("ARTICLE VI — RESIDUARY ESTATE");
  if (d.residualClause === "spouse" && t.spouseName) {
    para(
      `I give, devise and bequeath all the rest, residue and remainder of my estate, of whatever kind and wherever situated, to my spouse, ${t.spouseName}, if he or she survives me by thirty (30) days.`,
    );
  } else if (d.residualClause === "custom" && d.residualCustom) {
    para(d.residualCustom);
  } else {
    const benes = (d.beneficiaries ?? []).filter((b) => b.name?.trim());
    if (benes.length > 0) {
      para(
        "I give, devise and bequeath all the rest, residue and remainder of my estate, of whatever kind and wherever situated, to the following beneficiaries in the proportions stated:",
      );
      benes.forEach((b, i) =>
        para(
          `   ${i + 1}. ${b.name}${b.relation ? ` (${b.relation})` : ""} — ${b.sharePercent ?? 0}%.`,
        ),
      );
      para(
        "If any beneficiary named above does not survive me by thirty (30) days, that beneficiary's share shall be distributed pro rata among the surviving beneficiaries.",
      );
    } else {
      para(
        "I give, devise and bequeath all the rest, residue and remainder of my estate to my heirs at law, to be distributed according to the laws of intestate succession of the State named below.",
      );
    }
  }

  // Digital assets
  if (d.digitalAssets?.trim()) {
    heading("ARTICLE VII — DIGITAL ASSETS");
    para(
      "I authorize my Executor to access, modify, control, archive, transfer and delete my digital assets, including but not limited to email accounts, social media accounts, cloud storage, cryptocurrency and online financial accounts.",
    );
    para(`Specific instructions: ${d.digitalAssets}`);
  }

  // Final wishes
  if (d.finalWishes && (d.finalWishes.disposition || d.finalWishes.notes || d.finalWishes.organDonor)) {
    heading("ARTICLE VIII — FINAL WISHES");
    if (d.finalWishes.disposition) {
      para(`I direct that my remains be disposed of by ${d.finalWishes.disposition}.`);
    }
    if (d.finalWishes.organDonor) {
      para("I wish to be an organ and tissue donor to the extent permitted by law.");
    }
    if (d.finalWishes.notes) para(`Additional instructions: ${d.finalWishes.notes}`);
  }

  // Governing law
  heading("ARTICLE IX — GOVERNING LAW");
  para(
    `This Will shall be governed by and construed in accordance with the laws of the State of ${state || "[STATE]"}.`,
  );

  // Attestation
  heading("ATTESTATION");
  spacer(6);
  para(
    `IN WITNESS WHEREOF, I, ${fullName}, the Testator, sign my name to this instrument consisting of multiple pages, and being first duly sworn, do hereby declare to the undersigned authority that I sign and execute this instrument as my Last Will, that I sign it willingly, and that I execute it as my free and voluntary act for the purposes herein expressed.`,
  );
  spacer(20);
  draw("________________________________________", { gap: 2 });
  draw(`${fullName}, Testator`, { font: serifItalic, size: 10, gap: 12 });
  spacer(6);
  draw(`Date: _______________________`, { gap: 14 });

  para(
    `On the date last above written, ${fullName} declared to us, the undersigned witnesses, that the foregoing instrument is his/her Last Will and Testament, and requested us to act as witnesses. We, in his/her presence and in the presence of each other, hereunto sign our names as witnesses, believing the Testator to be of sound mind and memory.`,
  );
  spacer(16);

  const witnessBlock = (n: 1 | 2, name: string | undefined) => {
    draw("________________________________________", { gap: 2 });
    draw(`Witness ${n}: ${name || "[Print name]"}`, { font: serifItalic, size: 10, gap: 4 });
    draw("Address: _________________________________", { gap: 14 });
  };
  witnessBlock(1, d.attestation?.witness1Name);
  witnessBlock(2, d.attestation?.witness2Name);

  if (d.attestation?.notary) {
    heading("NOTARY ACKNOWLEDGMENT");
    para(`State of ${state || "[STATE]"}`);
    para("County of ______________________");
    spacer(8);
    para(
      `On this _____ day of ________________, 20____, before me personally appeared ${fullName}, known to me (or satisfactorily proven) to be the person whose name is subscribed to the within instrument, and acknowledged that he/she executed the same for the purposes therein contained.`,
    );
    spacer(20);
    draw("________________________________________", { gap: 2 });
    draw("Notary Public", { font: serifItalic, size: 10, gap: 4 });
    draw("My commission expires: _______________", { gap: 4 });
  }

  // Disclaimer footer on last page
  spacer(20);
  if (y < MARGIN + 60) newPage();
  draw(
    "DISCLAIMER: This document is a self-drafted template intended for personal organization. It is not legal advice. State witness, notarization and execution requirements vary. Consult a licensed estate attorney in your jurisdiction before executing this Will.",
    { font: serifItalic, size: 9, gap: 3 },
  );

  return await pdf.save();
}
