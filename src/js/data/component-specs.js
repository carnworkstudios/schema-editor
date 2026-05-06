/* ============================================================
   Component Specs — Electrical Domain Lookup Table
   Keyed by data-symbol attribute value (matches electricalKit.js IDs).
   Loaded only in electrical/index.html; other domains are unaffected.
   ============================================================ */

window.COMPONENT_SPECS = {

    // ── Passives ─────────────────────────────────────────────
    resistor: {
        description: 'Limits current flow; used for voltage dividers, biasing, and pull-up/pull-down.',
        pinCount: 2,
        pinNames: ['A', 'B'],
        keyParams: ['Resistance (Ω)', 'Power rating (W)', 'Tolerance (%)'],
        typical: ['100Ω', '1kΩ', '10kΩ', '100kΩ', '1MΩ'],
    },
    capacitor: {
        description: 'Stores electric charge; used for filtering, decoupling, and timing.',
        pinCount: 2,
        pinNames: ['A', 'B'],
        keyParams: ['Capacitance (F)', 'Voltage rating (V)', 'ESR (Ω)'],
        typical: ['10pF', '100pF', '10nF', '100nF', '1µF', '10µF'],
    },
    'cap-pol': {
        description: 'Polarized electrolytic capacitor; higher capacitance but polarity-sensitive.',
        pinCount: 2,
        pinNames: ['+', '−'],
        keyParams: ['Capacitance (µF)', 'Voltage rating (V)', 'Polarity'],
        typical: ['1µF', '10µF', '100µF', '470µF', '1000µF'],
    },
    inductor: {
        description: 'Stores energy in a magnetic field; used in filters, power conversion, and RF.',
        pinCount: 2,
        pinNames: ['A', 'B'],
        keyParams: ['Inductance (H)', 'Current rating (A)', 'DCR (Ω)', 'SRF (MHz)'],
        typical: ['1µH', '10µH', '100µH', '1mH', '10mH'],
    },

    // ── Semiconductors ────────────────────────────────────────
    diode: {
        description: 'Allows current in one direction only; used for rectification and protection.',
        pinCount: 2,
        pinNames: ['Anode', 'Cathode'],
        keyParams: ['Vf (V)', 'If_max (A)', 'Vrrm (V)', 'trr (ns)'],
        typical: ['1N4148', '1N4007', 'FR107'],
    },
    led: {
        description: 'Emits light when forward-biased; current-controlled brightness.',
        pinCount: 2,
        pinNames: ['Anode', 'Cathode'],
        keyParams: ['Vf (V)', 'If_typ (mA)', 'Wavelength (nm)'],
        typical: ['3mm Red', '5mm Green', 'SMD 0805 Blue', 'IR 940nm'],
    },
    zener: {
        description: 'Regulates voltage by conducting in reverse at a fixed breakdown voltage.',
        pinCount: 2,
        pinNames: ['Anode', 'Cathode'],
        keyParams: ['Vz (V)', 'Iz_max (mA)', 'Power (W)', 'Tolerance (%)'],
        typical: ['1N4733A 5.1V', '1N4740A 10V', 'BZX55C3V3'],
    },
    schottky: {
        description: 'Low forward-voltage Schottky diode; fast switching, minimal reverse recovery.',
        pinCount: 2,
        pinNames: ['Anode', 'Cathode'],
        keyParams: ['Vf (V)', 'Vrrm (V)', 'If_max (A)', 'trr (ns)'],
        typical: ['1N5819', 'BAT43', 'SS14'],
    },
    npn: {
        description: 'NPN bipolar transistor; controls collector current via base current.',
        pinCount: 3,
        pinNames: ['Base', 'Collector', 'Emitter'],
        keyParams: ['hFE (gain)', 'Vceo (V)', 'Ic_max (A)', 'Ft (MHz)'],
        typical: ['2N3904', 'BC547', 'PN2222'],
    },
    pnp: {
        description: 'PNP bipolar transistor; conducts when base is pulled low relative to emitter.',
        pinCount: 3,
        pinNames: ['Base', 'Collector', 'Emitter'],
        keyParams: ['hFE (gain)', 'Vce (V)', 'Ic_max (A)', 'Ft (MHz)'],
        typical: ['2N3906', 'BC557', 'PN2907'],
    },
    nmos: {
        description: 'N-channel MOSFET; voltage-controlled switch/amplifier, low on-resistance.',
        pinCount: 3,
        pinNames: ['Gate', 'Drain', 'Source'],
        keyParams: ['Vgs_th (V)', 'Rds_on (mΩ)', 'Id_max (A)', 'Vds_max (V)'],
        typical: ['IRF540N', '2N7000', 'AO3400'],
    },
    pmos: {
        description: 'P-channel MOSFET; high-side switch when gate is pulled below source.',
        pinCount: 3,
        pinNames: ['Gate', 'Drain', 'Source'],
        keyParams: ['Vgs_th (V)', 'Rds_on (mΩ)', 'Id_max (A)', 'Vds_max (V)'],
        typical: ['IRF9540', 'AO3401', 'FQP27P06'],
    },

    // ── Power ─────────────────────────────────────────────────
    battery: {
        description: 'DC voltage source; models a battery or power supply in the schematic.',
        pinCount: 2,
        pinNames: ['+', '−'],
        keyParams: ['Voltage (V)', 'Capacity (mAh)', 'Chemistry'],
        typical: ['1.5V AA', '3.7V Li-Po', '9V PP3', '12V SLA'],
    },
    'ac-source': {
        description: 'AC sinusoidal voltage source; models mains power or AC generator.',
        pinCount: 2,
        pinNames: ['L', 'N'],
        keyParams: ['Voltage RMS (V)', 'Frequency (Hz)', 'Phase (°)'],
        typical: ['120VAC 60Hz', '230VAC 50Hz'],
    },
    gnd: {
        description: 'Ground reference (0 V). All GND symbols in a schematic share the same net.',
        pinCount: 1,
        pinNames: ['GND'],
        keyParams: [],
        typical: [],
    },
    vcc: {
        description: 'Power rail symbol. All VCC symbols with the same label share the same net.',
        pinCount: 1,
        pinNames: ['PWR'],
        keyParams: ['Voltage (V)'],
        typical: ['+3.3V', '+5V', '+12V', '+15V'],
    },

    // ── Switches ──────────────────────────────────────────────
    spst: {
        description: 'Single-pole single-throw switch; open or closed circuit.',
        pinCount: 2,
        pinNames: ['A', 'B'],
        keyParams: ['Current rating (A)', 'Voltage rating (V)', 'Actuation'],
        typical: ['SPST Toggle', 'Slide Switch', 'Reed Switch'],
    },
    pushbutton: {
        description: 'Momentary push-button; closes (or opens) circuit only while pressed.',
        pinCount: 2,
        pinNames: ['A', 'B'],
        keyParams: ['Type (NO/NC)', 'Current rating (A)', 'Actuation force (gf)'],
        typical: ['6×6mm Tactile', '12mm Illuminated', 'E-stop NO'],
    },

    // ── ICs ───────────────────────────────────────────────────
    'ic-generic': {
        description: 'Generic IC placeholder; customize the label with the actual part number.',
        pinCount: null,
        pinNames: [],
        keyParams: ['Part number', 'Package', 'Supply voltage (V)'],
        typical: ['ATmega328P', 'STM32F103', 'ESP32'],
    },
    opamp: {
        description: 'Operational amplifier; high-gain differential voltage amplifier.',
        pinCount: 3,
        pinNames: ['IN−', 'IN+', 'OUT'],
        keyParams: ['GBW (MHz)', 'Slew rate (V/µs)', 'Ib (nA)', 'Vos (mV)'],
        typical: ['LM358', 'TL071', 'LM741', 'MCP6001'],
    },

    // ── Logic Gates ───────────────────────────────────────────
    'gate-and': {
        description: 'AND gate: output HIGH only when all inputs are HIGH.',
        pinCount: 3,
        pinNames: ['IN1', 'IN2', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS08', '74HC08', 'CD4081'],
    },
    'gate-or': {
        description: 'OR gate: output HIGH when any input is HIGH.',
        pinCount: 3,
        pinNames: ['IN1', 'IN2', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS32', '74HC32', 'CD4071'],
    },
    'gate-not': {
        description: 'NOT gate (inverter): output is the logical complement of the input.',
        pinCount: 2,
        pinNames: ['IN', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS04', '74HC04', 'CD4069'],
    },
    'gate-nand': {
        description: 'NAND gate: output LOW only when all inputs are HIGH (universal gate).',
        pinCount: 3,
        pinNames: ['IN1', 'IN2', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS00', '74HC00', 'CD4011'],
    },
    'gate-nor': {
        description: 'NOR gate: output HIGH only when all inputs are LOW (universal gate).',
        pinCount: 3,
        pinNames: ['IN1', 'IN2', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS02', '74HC02', 'CD4001'],
    },
    'gate-xor': {
        description: 'XOR gate: output HIGH when inputs differ; used in adders and parity checkers.',
        pinCount: 3,
        pinNames: ['IN1', 'IN2', 'OUT'],
        keyParams: ['Logic family', 'Supply (V)', 'Propagation delay (ns)'],
        typical: ['74LS86', '74HC86', 'CD4030'],
    },

    // ── Connectors & Wiring ───────────────────────────────────
    connector: {
        description: 'Generic connector/header; used for edge connections and inter-board links.',
        pinCount: null,
        pinNames: ['1', '2', '…'],
        keyParams: ['Pin count', 'Pitch (mm)', 'Current rating (A)'],
        typical: ['2.54mm 2-pin', 'JST-PH 2-pin', 'USB-C', 'DB9'],
    },
    'net-label': {
        description: 'Net label: electrically connects all pins sharing the same label text.',
        pinCount: 1,
        pinNames: ['Net'],
        keyParams: ['Net name'],
        typical: ['VCC', 'GND', 'SDA', 'SCL', 'TX', 'RX'],
    },
};
