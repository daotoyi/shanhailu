/** 对话节点与对话树类型(供 dialogs.ts 与各章剧本文件共用,避免循环依赖) */

export interface DialogNode {
  speaker?: string;
  /** 头像标识:角色色板 id 或 'master'/'player' 等命名位 */
  portrait?: string;
  text: string;
  choices?: { text: string; next: string }[];
  next?: string;
  /** 本句播完时应用的效果前缀列表 */
  actions?: string[];
  /** 结束节点:标记 dialog 结束 */
  end?: boolean;
}

export interface DialogTree {
  root: string;
  nodes: Record<string, DialogNode>;
}
