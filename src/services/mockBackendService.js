export const NETWORK_NODES = [
  { id:"DO",  lbl:"Dortmund",   rx:.73, ry:.15, tgt:true },
  { id:"BO",  lbl:"Bochum",     rx:.51, ry:.25 },
  { id:"ES",  lbl:"Essen",      rx:.26, ry:.22 },
  { id:"DU",  lbl:"Duisburg",   rx:.07, ry:.37 },
  { id:"MH",  lbl:"Mülheim",    rx:.16, ry:.51 },
  { id:"HA",  lbl:"Hagen",      rx:.73, ry:.50 },
  { id:"WU",  lbl:"Wuppertal",  rx:.53, ry:.62 },
  { id:"DUS", lbl:"Düsseldorf", rx:.26, ry:.70 },
  { id:"KO",  lbl:"Köln",       rx:.13, ry:.84 },
];

export const NETWORK_LINKS = [
  { id:"ES-BO",  a:"ES",  b:"BO",  tree:"t1", lbl:"Essen ↔ Bochum" },
  { id:"BO-DO",  a:"BO",  b:"DO",  tree:"t1", lbl:"Bochum ↔ Dortmund" },
  { id:"BO-HA",  a:"BO",  b:"HA",  tree:"t1", lbl:"Bochum ↔ Hagen" },
  { id:"HA-DO",  a:"HA",  b:"DO",  tree:"t2", lbl:"Hagen ↔ Dortmund" },
  { id:"ES-DU",  a:"ES",  b:"DU",  tree:"t1", lbl:"Essen ↔ Duisburg" },
  { id:"DU-MH",  a:"DU",  b:"MH",  tree:"t2", lbl:"Duisburg ↔ Mülheim" },
  { id:"MH-DUS", a:"MH",  b:"DUS", tree:"t1", lbl:"Mülheim ↔ Düsseldorf" },
  { id:"DUS-WU", a:"DUS", b:"WU",  tree:"t2", lbl:"Düsseldorf ↔ Wuppertal" },
  { id:"ES-WU",  a:"ES",  b:"WU",  tree:"t2", lbl:"Essen ↔ Wuppertal" },
  { id:"WU-HA",  a:"WU",  b:"HA",  tree:"t1", lbl:"Wuppertal ↔ Hagen" },
  { id:"WU-DO",  a:"WU",  b:"DO",  tree:"t2", lbl:"Wuppertal ↔ Dortmund" },
  { id:"DUS-KO", a:"DUS", b:"KO",  tree:"t1", lbl:"Düsseldorf ↔ Köln" },
];

export const METRIC_BENCHMARKS = {
  "Hop-Count": {
    bonsaiAvgStretch: "1.5", bonsaiMaxStretch: "1.8", greedyAvgStretch: "2.1",
    bonsaiTime: "12 ms", greedyTime: "148 ms", esAvg: "1.0", esMax: "1.0",
    pathPrimary: { hop:"ES → WU → DO", lat:"3 Hops", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"2 Hops", status:"🟣 Standby" },
  },
  "Latency (ms)": {
    bonsaiAvgStretch: "1.3", bonsaiMaxStretch: "1.6", greedyAvgStretch: "2.4",
    bonsaiTime: "9 ms", greedyTime: "183 ms", esAvg: "1.1", esMax: "1.2",
    pathPrimary: { hop:"ES → WU → DO", lat:"24ms", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"12ms", status:"🟣 Standby" },
  },
  "Cost (Abstract)": {
    bonsaiAvgStretch: "1.7", bonsaiMaxStretch: "2.1", greedyAvgStretch: "2.8",
    bonsaiTime: "17 ms", greedyTime: "201 ms", esAvg: "1.0", esMax: "1.3",
    pathPrimary: { hop:"ES → WU → DO", lat:"0.74 cost", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"0.41 cost", status:"🟣 Standby" },
  },
};
