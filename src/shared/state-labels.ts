const EXACT_LABELS: Record<string, string> = {
  D0_INTRO: "0日目｜オープニング",
  D0_ISLAND_NAME: "0日目｜島名確認",
  D0_STARTER_SELECT: "0日目｜スターター製品選択",
  D0_STARTER_RESULT: "0日目｜スターター結果",
  D0_PRACTICE_EXPLORE: "0日目｜練習探索",
  D0_PRACTICE_RESULT: "0日目｜練習探索結果",
  D0_TUTORIAL_BUILD: "0日目｜無料整備",
  D0_TUTORIAL_BUILD_RESULT: "0日目｜無料整備結果",
  D0_STORM_WARNING: "0日目｜台風警報",
  D2_BUOY_CHOICE: "2日目｜観測ブイの選択",
  D2_BUOY_RESULT: "2日目｜観測ブイの結果",
  D3_HEAVY_RAIN: "3日目｜集中豪雨",
  D3_HEAVY_RAIN_RESULT: "3日目｜集中豪雨の結果",
  D4_DRONE_CHOICE: "4日目｜観測ドローンの選択",
  D4_DRONE_RESULT: "4日目｜観測ドローンの結果",
  D5_TYPHOON_REVEAL: "5日目｜台風タイプ発表",
  D5_ROUTE_FAILURE: "5日目｜ルート崩壊",
  D5_ROUTE_FAILURE_RESULT: "5日目｜ルート崩壊の結果",
  D6_FULL_FORECAST: "6日目｜完全予報",
  D6_EXPLORATION_CLOSED: "6日目｜探索終了",
  D7_RETURN_TO_MAIN: "7日目｜メインルームへ集合",
  D7_BRIEFING: "7日目｜最終台風ブリーフィング",
  D7_FINAL_COUNCIL: "7日目｜最終作戦会議",
  D7_RAIN_INPUT: "7日目｜記録的大雨・緊急設置判断",
  D7_RAIN_RESULT: "7日目｜記録的大雨の結果",
  D7_ROUTE_INPUT: "7日目｜ルート崩壊・緊急設置判断",
  D7_ROUTE_RESULT: "7日目｜ルート崩壊の結果",
  D7_EYE_OF_STORM: "7日目｜台風の目",
  D7_WIND_INPUT: "7日目｜暴風・斜面崩壊・緊急設置判断",
  D7_WIND_RESULT: "7日目｜暴風・斜面崩壊の結果",
  D7_BLACKOUT_INPUT: "7日目｜停電・通信障害・緊急設置判断",
  D7_BLACKOUT_RESULT: "7日目｜停電・通信障害の結果",
  D7_COMPLETE: "7日目｜台風通過",
  D8_RESCUE: "8日目｜救助・結果"
};

const SUFFIX_LABELS: Array<[RegExp, string]> = [
  [/^D(\d+)_OPEN$/, "$1日目｜開始"],
  [/^D(\d+)_MORNING_COUNCIL$/, "$1日目｜朝の作戦会議"],
  [/^D(\d+)_MORNING_INPUT$/, "$1日目｜朝の回答入力"],
  [/^D(\d+)_MORNING_LOCKED$/, "$1日目｜朝の回答締切"],
  [/^D(\d+)_MORNING_REVEAL$/, "$1日目｜朝の選択公開"],
  [/^D(\d+)_MORNING_RESULT$/, "$1日目｜朝の結果"],
  [/^D(\d+)_AFTERNOON_COUNCIL$/, "$1日目｜午後の作戦会議"],
  [/^D(\d+)_AFTERNOON_INPUT$/, "$1日目｜午後の回答入力"],
  [/^D(\d+)_AFTERNOON_LOCKED$/, "$1日目｜午後の回答締切"],
  [/^D(\d+)_AFTERNOON_REVEAL$/, "$1日目｜午後の選択公開"],
  [/^D(\d+)_AFTERNOON_RESULT$/, "$1日目｜午後の結果"],
  [/^D(\d+)_SUMMARY$/, "$1日目｜まとめ"]
];

export function stateLabel(stateId: string): string {
  const exact = EXACT_LABELS[stateId];
  if (exact) return exact;
  for (const [pattern, replacement] of SUFFIX_LABELS) {
    if (pattern.test(stateId)) return stateId.replace(pattern, replacement);
  }
  return stateId;
}
