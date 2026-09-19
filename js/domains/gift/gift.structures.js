/**
 * domains/gift/gift.structures.js
 *
 * Manifest: Gift-Name -> lokaler Dateiname des Strukturbilds
 * (img/domains/gift/structures/<datei>). Die Bilder wurden einmalig
 * von PubChem heruntergeladen und liegen lokal im Repo, damit die
 * Darstellung **unabhängig vom Internetzugang des Nutzers** im
 * Browser funktioniert (kein Live-Nachladen von externen APIs).
 *
 * Neues Gift mit Strukturbild ergänzen: PNG (idealerweise 200x200)
 * unter img/domains/gift/structures/ ablegen und hier per exaktem
 * `gift.name` als Schlüssel eintragen.
 */
export const GIFT_STRUCTURE_IMAGES = {
  "Aconitin": "aconitin.png",
  "Aflatoxin B1": "aflatoxin-b1.png",
  "Alpha-Amanitin (Knollenblätterpilzgift)": "alpha-amanitin-knollenbl-tterpilzgift.png",
  "Anatoxin-a": "anatoxin-a.png",
  "Arsen (Arsentrioxid)": "arsen-arsentrioxid.png",
  "Atropin (Tollkirschengift)": "atropin-tollkirschengift.png",
  "Batrachotoxin": "batrachotoxin.png",
  "Bienengift": "bienengift.png",
  "Cicutoxin (Wasserschierlingsgift)": "cicutoxin-wasserschierlingsgift.png",
  "Colchicin": "colchicin.png",
  "Coniin (Schierlingsgift)": "coniin-schierlingsgift.png",
  "Cyanid (Blausäure)": "cyanid-blaus-ure.png",
  "Cylindrospermopsin": "cylindrospermopsin.png",
  "Cytisin (Goldregengift)": "cytisin-goldregengift.png",
  "Digoxin / Digitoxin (Fingerhutgift)": "digoxin-digitoxin-fingerhutgift.png",
  "Ergotamin (Mutterkorngift)": "ergotamin-mutterkorngift.png",
  "Ethylenglykol": "ethylenglykol.png",
  "Kohlenmonoxid": "kohlenmonoxid.png",
  "Maitotoxin": "maitotoxin.png",
  "Methanol": "methanol.png",
  "Microcystin-LR": "microcystin-lr.png",
  "Natriumfluoracetat (Verbindung 1080)": "natriumfluoracetat-verbindung-1080.png",
  "Nikotin": "nikotin.png",
  "Oleandrin": "oleandrin.png",
  "Palytoxin": "palytoxin.png",
  "Polonium-210": "polonium-210.png",
  "Sarin (Nervenkampfstoff)": "sarin-nervenkampfstoff.png",
  "Saxitoxin": "saxitoxin.png",
  "Senfgas (Schwefel-Lost)": "senfgas-schwefel-lost.png",
  "Solanin": "solanin.png",
  "Soman (Nervenkampfstoff)": "soman-nervenkampfstoff.png",
  "Strychnin": "strychnin.png",
  "Tabun (Nervenkampfstoff)": "tabun-nervenkampfstoff.png",
  "Taxin (Eibengift)": "taxin-eibengift.png",
  "Tetrodotoxin": "tetrodotoxin.png",
  "VX (Nervenkampfstoff)": "vx-nervenkampfstoff.png",
  "Chlorgas": "chlorgas.png",
  "Quecksilber (Methylquecksilber)": "quecksilber-methylquecksilber.png",
  "Thallium": "thallium-i-sulfat.png",
  "Novichok (A-234)": "novichok-a-234.png",
};

const STRUCTURE_BASE_PATH = "img/domains/gift/structures/";

/** Liefert den relativen Pfad zum Strukturbild eines Gifts, oder null
 *  falls keines hinterlegt ist (z.B. reine Protein-/Tiergifte ohne
 *  einzelne chemische Struktur). */
export function getStructureImagePath(gift) {
  const filename = GIFT_STRUCTURE_IMAGES[gift.name];
  return filename ? `${STRUCTURE_BASE_PATH}${filename}` : null;
}
