/** 炼药配方(PROMPT §3.10):材料 → 丹药;失败损失材料 */
export interface RecipeDef {
  id: string;
  name: string;
  inputs: [string, number][];
  output: string;
  outputCount: number;
  /** 基础成功率(炼药等级每级 +6%,上限 95%) */
  baseRate: number;
  /** 所需炼药等级 */
  levelReq: number;
}

export const RECIPES: RecipeDef[] = [
  { id: 'r_huixue', name: '回血丹', inputs: [['herb_qingjingzhi', 2]], output: 'pill_huixue', outputCount: 1, baseRate: 0.8, levelReq: 0 },
  { id: 'r_ningshen', name: '凝神丹', inputs: [['herb_ningxinlian', 1], ['herb_qingjingzhi', 1]], output: 'pill_ningshen', outputCount: 1, baseRate: 0.78, levelReq: 1 },
  { id: 'r_jiedu', name: '解毒丹', inputs: [['herb_qingjingzhi', 1], ['herb_xuejiancao', 2]], output: 'pill_jiedu', outputCount: 1, baseRate: 0.72, levelReq: 1 },
  { id: 'r_longli', name: '龙力散', inputs: [['herb_xuejiancao', 2], ['mat_ape_fang', 1]], output: 'pill_longli', outputCount: 1, baseRate: 0.66, levelReq: 2 },
  { id: 'r_tiegu', name: '铁骨散', inputs: [['herb_duanxuyin', 2], ['mat_ape_fang', 1]], output: 'pill_tiegu', outputCount: 1, baseRate: 0.66, levelReq: 2 },
];
