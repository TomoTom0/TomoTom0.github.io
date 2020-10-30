const seps_all = {
  ygo_uploaded_deck: [null, ":::", "___"],
  ygo_set_candidate: ["--", null, "__"],
  ygo_set: ["---", ":::", "___"],
  ygo_search_candidate: ["----", "::::", "____"],
  ygo_search: ["-----", ":::::", "_____"],
  ygo_hand_candidate: ["----", "::::", "____"],
  ygo_hand: ["-----", ":::::", "_____"],
  ygo_group_candidate: ["------", "::::::", "______"],
  ygo_group: ["-------", ":::::::", "_______"],
};

const ygo_db_url = "data/ProjectIgnis/ygo_db.csv";
const ygo_db_complex_url = "data/ProjectIgnis/ygo_db_complex.csv";
const listAddition = { search: [ "To", "From"], set: ["And", "Or"] };
const lowerList = { hand: ["set"],search: ["set"], set: ["set"], group: ["set", "hand", "group"]};
let GLOBAL_df;
let GLOBAL_df_complex;
let GLOBAL_data_main=[];
let GLOBAL_deck_data=[];

function remake_option(options, select_id, overWrite = true, values = [], form = "select") {
  const select_id_re = select_id.replace(/^#/, "");
  const select = $(`#${select_id_re}`);
  if (overWrite) $(`${form}#${select_id_re} option`).remove();
  if (values == [] || values.length != options.length) values = options;
  for (let i = 0; i < options.length; i++) {
    const option = $("<option>").text(options[i]).val(values[i]);
    select.append(option);
  };
};

function remake_button(body_id = "", button_contents = [], overWrite = true) {
  const body = $(`#${body_id}`);
  if (overWrite) $(`#${body_id} button`).remove();
  button_contents.forEach(d => {
    const default_conetnt = { type: "button", class: "mdl-button" };
    const button = $("<button />", { ...default_conetnt, ...d }).append(d.value);
    body.append(button);
  })
}

function remake_button(body_id = "", button_contents = [], overWrite = true) {
  const body = $(`#${body_id}`);
  if (overWrite) $(`#${body_id} button`).remove();
  button_contents.forEach(d => {
    const default_conetnt = { type: "button", class: "mdl-button" };
    const button = $("<button/>", { ...default_conetnt, ...d }).append(d.value);
    body.append(button);
  })
}





async function obtain_default_deck_names() {
  return await fetch("data/ProjectIgnis/deck/ydks.dat")
    .then(res => res.text())
    .then(data => data.split("\n"));
}

async function obtain_default_deck_data(deck_name) {
  if (!deck_name) return [];
  const file_url = `data/ProjectIgnis/deck/${deck_name}`;
  const data = await fetch(file_url).then(res => res.text());
  const deck_data=data.replace(/\r\n|\r(?=[^\n])/g, "\n").split("\n").filter(d => d);
  return deck_data;
}

async function obtain_deck_data(deck_name=""){
  if (!deck_name) return [];
  if (obtain_uploaded_deck(true).indexOf(deck_name)!=-1){
    return obtain_uploaded_deck(false, deck_name);
  }
  const default_deck_names=localStorage.default_deck_names.split(",");
  if (default_deck_names.indexOf(deck_name)!=-1){
    return obtain_default_deck_data(deck_name);
  }
  return [];
}


function import_cache(data, limit_name = null, include_deck = true) {
  data_json = JSON.parse(data);
  for (key of Object.keys(seps_all)) {
    const seps = seps_all[key];
    let before_storage = [];
    if (localStorage[key]) before_storage = localStorage[key].split(seps[2]);
    let data_json_tmp = [];
    if (data_json[key]) data_json_tmp = data_json_tmp;
    let before_storage_tmp = [];
    if (key == "ygo_uploaded_deck") {
      if (include_deck) before_storage_tmp = data_json_tmp;
    }
    else if (!limit_name) before_storage_tmp = data_json_tmp.filter(d => d.split([seps[0]])[0] == limit_name);
    else before_storage_tmp = data_json_tmp.filter(d => d.indexOf(seps[0]) != -1 && d.indexOf(seps[1]) != -1);
    localStorage[key] = Array.from(new Set(before_storage.concat(before_storage_tmp))).join(seps[2]);
  }
}

function remake_all() {
  const input_ids = {
    item: "ygo_calc1_input_item",
    condition: "ygo_calc1_input_condition",
    keyword_list: "ygo_calc1_input_keywordlist",
  };
  remake_itemConditionKey_options(input_ids);
  remake_calc3_result();
  remake_calc3_option();
  localStorage.ygo_searchId = JSON.stringify(ygo_search_check_1());
  remake_calc5_result();
}

function operate_storage(storage_key = "", operate = "", selected_sentence = "", new_name = null, submit_key = null) {
  const deck_name = $("#ygo_calc0_input_deck").val();
  if (!storage_key || Object.keys(seps_all).indexOf(storage_key) == -1) return;
  const seps = seps_all[storage_key];
  let before_storage = [];
  if (localStorage.getItem(storage_key))
    before_storage = localStorage.getItem(storage_key).split(seps[2]);
  if (operate == "deleteAll") {
    localStorage[storage_key] = Array.from(
      new Set(before_storage.filter(d => d.split(seps[0])[0] != deck_name))
    ).join(seps[2]);
  } else if (operate == "delete") {
    localStorage[storage_key] = Array.from(
      new Set(before_storage.filter(d => d.split(seps[0])[0] != deck_name || d.split(seps[0])[1] != selected_sentence))).join(seps[2]);
  } else if (operate == "add") {
    if (!selected_sentence) return;
    let content = "";
    if (new_name)
      content = `${deck_name}${seps[0]}${new_name}${seps[1]}${selected_sentence}`;
    else content = `${deck_name}${seps[0]}${selected_sentence}`;
    if (!content) return;
    before_storage.push(content);
    localStorage[storage_key] = Array.from(new Set(before_storage)).join(seps[2]);
  } else if (operate == "obtain") {
    return before_storage
      .filter(d => d.split(seps[0])[0] == deck_name)
      .map(d => d.split(seps[0])[1]);
  } else if (operate == "submit") {
    if (Object.keys(seps_all).indexOf(submit_key) == -1) return;
    const content = before_storage
      .filter(d => d.split(seps[0])[0] == deck_name)
      .map(d => d.split(seps[0])[1])
      .join(seps[2]);

    operate_storage(submit_key, "add", content, new_name);
    operate_storage(storage_key, "deleteAll");
  } else if (operate == "rename") {
    operate_storage(storage_key, "delete", selected_sentence);
    operate_storage(storage_key, "add", selected_sentence.split(seps[1])[1], new_name);
  }
}

async function remake_itemConditionKey_options(input_ids, change_condition = true) {
  const item_numbers = ["id", "level", "PS", "atk", "def"];
  const item_limited_strings = ["attribute", "id"];
  const item_include_strings = ["cat_Jap", "cat_Eng", "desc_Jap", "desc_Eng", "type", "effect"];
  const selected_item = $(`#${input_ids.item}`).val();
  if (change_condition) {
    const options_numbers = ["==", "!=", ">", "<"];
    const options_limited_strings = ["==", "!="];
    const options_include_strings = ["include", "not include"];
    const options_unlimited_strings = ["==", "!=", "include", "not include"];
    let options = [];
    if (item_numbers.indexOf(selected_item) != -1) {
      options = options_numbers;
    } else if (item_limited_strings.indexOf(selected_item) != -1) {
      options = options_limited_strings;
    } else if (item_include_strings.indexOf(selected_item) != -1) {
      options = options_include_strings;
    } else options = options_unlimited_strings;
    remake_option(options, input_ids.condition, (overWrite = true));
  }
  const data_main=GLOBAL_data_main;
  if (!data_main || !selected_item) return;
  const df=GLOBAL_df;
  let sorted_array_tmp = df.filter(row => data_main.indexOf(row.get("id")) != -1)
          .toDict()[selected_item].slice().sort();

  let array_option = [];
  if (["type", "cat_Jap", "cat_Eng", "effect"].indexOf(selected_item) != -1) {
    sorted_array_tmp.forEach(d => array_option = array_option.concat(d.split(" ")));
  }
  else array_option = sorted_array_tmp;
  if (selected_item=="AutoSet"){
    const seps2=seps_all[`ygo_search_candidate`];
    const seps3=seps_all[`ygo_set`];
    const candidate_sets=operate_storage(`ygo_search_candidate`, "obtain")
    .filter(d=>d.split(seps2[1])[0]=="From").map(d=>d.split(seps2[1])[1]);
    const candidate_ids=ygo_search(candidate_sets);
    const df_complex=obtain_df("complex");
    let autoset_complex=[];
    candidate_ids.forEach(ids=>ids.forEach(id=>{
      autoset_complex=autoset_complex.concat(df_complex.filter(row=>row.get("id")==id).toDict()["AutoSet"][0]
      .split("\n").map(d=>`.${seps3[1]}${d}`));
    }));
    array_option=autoset_complex.concat(array_option);
  }
  let options_key = Array.from(new Set(array_option)).slice().sort();
  remake_option(options_key, input_ids.keyword_list, true, [], "");
}

function remake_calc0_result() {
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck"))
    before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
  let options = before_ygo_uploaded_deck.map(d => d.split(seps[1])[0]);
  remake_option(options, "ygo_calc0_input_anotherDeck");
  remake_option(options, "ygo_calc0_input_deck");
  const fileList = localStorage.default_deck_names.split(",");
  remake_option(fileList, "ygo_calc0_input_deck", false);
  remake_option(fileList, "ygo_calc0_input_anotherDeck", false);
}


function remake_calc3_option(change_condition = true, change_item = true, change_addition = true) {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const selectedItem = $("#ygo_calc3_input_item").val();
  paren_mode=JSON.parse(localStorage.paren_mode);
  let paren=false;
  if (paren_mode[selectedList]) paren=true;

  if (paren || selectedList!= "hand"){
    $("#ygo_calc3_input_minNumber").prop("disabled", true);
    $("#ygo_calc3_input_maxNumber").prop("disabled", true);
  } else{
    $("#ygo_calc3_input_minNumber").prop("disabled", false);
    $("#ygo_calc3_input_maxNumber").prop("disabled", false);

  }
  if (change_addition || paren) {
    if (paren && operate_storage(`ygo_${selectedList}_candidate`, "obtain").length>paren_mode[selectedList]){
      remake_option(["And", "Or"], "ygo_calc3_input_addition");
    }
    else if (!paren && selectedList=="set" && operate_storage(`ygo_${selectedList}_candidate`, "obtain").length==0){
      remake_option([], "ygo_calc3_input_addition");
    }
    else if (!paren && selectedList=="search" && operate_storage(`ygo_${selectedList}_candidate`, "obtain").length==0){
      remake_option(["From"], "ygo_calc3_input_addition");
    }
    else if (!paren && Object.keys(listAddition).indexOf(selectedList) != -1) {
      remake_option(listAddition[selectedList], "ygo_calc3_input_addition");
    }
    else remake_option([], "ygo_calc3_input_addition");
  }
  if (change_item) {
    default_keys = localStorage.default_keys.split(",");
    let item_options=default_keys.concat(lowerList[selectedList].map(d => d[0].toUpperCase() + d.slice(1)));
    if (!paren && selectedList=="search" && operate_storage(`ygo_${selectedList}_candidate`, "obtain").length>0){
      item_options=["AutoSet"].concat(item_options);
      remake_option(item_options, "ygo_calc3_input_item");
    } else {
      remake_option(item_options, "ygo_calc3_input_item");
    }
  }
  if (["set", "hand", "group"].indexOf(selectedItem.toLowerCase()) != -1) {
    if (change_condition) remake_option(["=="], "ygo_calc3_input_condition");
    not_sorted_array = operate_storage(`ygo_${selectedItem.toLowerCase()}`, "obtain");
    let options_key = Array.from(new Set(not_sorted_array)).slice().sort();
    remake_option(options_key, "ygo_calc3_input_keyword_list", true, [], "");
  } else if (selectedItem) {
    const input_ids = {
      item: "ygo_calc3_input_item",
      condition: "ygo_calc3_input_condition",
      keyword_list: "ygo_calc3_input_keyword_list",
    };
    remake_itemConditionKey_options(input_ids, change_condition);
  }
}


function remake_calc3_result() {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const candidates = operate_storage(`ygo_${selectedList}_candidate`, "obtain");
  const seps = seps_all[`ygo_${selectedList}_candidate`];
  $("#ygo_calc3_result_card1").html(remake_array(candidates, "candidate", seps[1]).join("<br>"));
  const seps2 = seps_all[`ygo_${selectedList}`];
  const results = operate_storage(`ygo_${selectedList}`, "obtain");
  $("#ygo_calc3_result_card2").html(remake_array(results, "result", seps2[1]).join("<br><br>"));
  if (selectedList == "search") localStorage.ygo_searchId = JSON.stringify(ygo_search_check_1());
  if (candidates.length>0) {
    $("#ygo_calc3_container_card1").css("width", "100%");
    $("#ygo_calc3_popup_container_card1").css("width", "100%");
    $("#ygo_calc3_container_card2").css("width", "0%");
    $("#ygo_calc3_popup_container_card2").css("width", "0%");
  } else {
    $("#ygo_calc3_container_card2").css("width", "100%");
    $("#ygo_calc3_popup_container_card2").css("width", "100%");
    $("#ygo_calc3_container_card1").css("width", "0%");
    $("#ygo_calc3_popup_container_card1").css("width", "0%");
  }
}
async function remake_calc5_search_result() {
  let ids_sum = [];
  if (localStorage.ids_sums)
    localStorage.ids_sums.split("\n").forEach(d=>ids_sum=ids_sum.concat(d.split(",")));
  if ($("#ygo_calc5_check_search_include:checked").val() == "on") {
    let ids = { searcher: [], searched: [] }
    if (localStorage.ygo_searchId) {
      ids = JSON.parse(localStorage.ygo_searchId);
    }
    for (_ of Array(10)) {
      ids_sum = ygo_search_check_2([ids_sum], ids)[0];
    }
  }
  const data_main=GLOBAL_data_main;

  let ids_sum2 = [];
  if ($("#ygo_calc5_check_search_all:checked").val() == "on") ids_sum2 = ids_sum;
  else ids_sum2 = data_main.filter(d => ids_sum.indexOf(d) != -1);
  if ($("#ygo_calc5_check_search_unique:checked").val() == "on")
    ids_sum2 = Array.from(new Set(ids_sum2));
  const df=GLOBAL_df;
  let content = ids_sum2
    .map(id => df.filter(row => row.get("id") === id).toDict()["Jap"][0]).slice().sort();
  const selectedList = $("#ygo_calc5_input_list").val();
  const selectedContent = $("#ygo_calc5_input_listContent").val();
  if (selectedList == "Group" || !selectedContent) content = ["Valid SET should be selected."];
  $("#ygo_calc5_result_card2").html("<b>Search Results</b><br>" + content.join("<br>"));
}

function remake_calc5_result_draw() {
  //let before_ygo_groups=operate_storage("ygo_group", "obtain");
  let before_ygo_hands = operate_storage("ygo_hand", "obtain");

  let initial_hand = [];
  let initial_ids = [];
  if (localStorage.ygo_tryDraw) {
    ygo_tryDraw = JSON.parse(localStorage.ygo_tryDraw);
    initial_hand = ygo_tryDraw.initial_hand.split(",");
    initial_ids = ygo_tryDraw.random_ids.split(",").slice(0, initial_hand.length);
  }
  const judges_hands = ygo_judge(before_ygo_hands, initial_ids, true);
  //const judges_groups=ygo_judge(before_ygo_hands, initial_ids, include_search=true).then(_=>_);

  const seps = seps_all["ygo_hand"];
  const options_new = before_ygo_hands.map((d, index) => ` ${d.split(seps[1])[0]}<br>---${judges_hands[index]}`);
  $("#ygo_calc5_result_card2").html("<b>Draw Cards</b><br>" + initial_hand.join("<br>"));
  $("#ygo_calc5_result_card1").html(options_new.join("<br>").replace(/:::::|::::|:::/g, "_").replace(/\n/g, "<br>").replace(/,/g, " ").replace(/_._/g, "_"));
}


function remake_calc5_result() {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();

  let values = operate_storage(`ygo_${selectedList}`, "obtain");
  const options = remake_array(values, "result_option");
  remake_option(options, "ygo_calc5_input_listContent", true, values);
}

function ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, include_search = true, ids) {
  let judges = [];
  if (include_search) {
    for (ids_sums_tmp of ids_sums_tmps) {
      for (_ of Array(10))
        ids_sums_tmp = ygo_search_check_2(ids_sums_tmp, ids);
    }
  }
  for (i = 0; i < ids_sums_tmps.length; i++) {
    let min_maxs = min_maxss[i];
    const ids_sums_tmp = ids_sums_tmps[i];
    let ids_sums = ids_sums_tmp.map(d => Array.from(new Set(d)));
    if (!ids_sums) ids_sums = [];
    let ids_sums_filtered = ids_sums_tmp
      .map(d => Array.from(new Set(d)))
      .map(d => d.filter(dd => initial_ids.includes(dd)));
    let array_tmp = [];
    ids_sums_filtered.forEach(d => array_tmp = array_tmp.concat(d));
    const keys_tmp = Array.from(new Set(array_tmp));
    let counts_tmp = Array(keys_tmp.length);
    keys_tmp.forEach((key, index) => counts_tmp[index] = array_tmp.filter(d => d == key).length);
    counts_tmp.forEach((count, index) => {
      if (count > 1) {
        const tmp_length = ids_sums_filtered.filter(d => {
          d.indexOf(keys_tmp[index]) != -1 && d.length == 1
        }).length;
        if (tmp_length > 1) ids_sums_filtered.map(d => {
          if (d.indexOf(keys_tmp[index]) != -1 && d.length == 1) return [];
          else return d;
        })
      }
    })
    const judge_tmps = ids_sums_filtered.map((d, index) => {
      tmp_length = d.length;
      const min_max = min_maxs[index].split("-");
      let judge = true;
      if (min_max[0] != "") if (Number(min_max[0]) > tmp_length) judge = false;
      if (min_max[1] != "") if (Number(min_max[1]) < tmp_length) judge = false;
      return judge;
    });
    judges.push(judge_tmps.every(d => d));
  }
  return judges.map(d => {
    if (d) return "O";
    else return "X";
  });
}

function ygo_judge(options, initial_ids, include_search = false) {
  if (!options) return [];
  seps1 = seps_all["ygo_hand"];
  seps2 = seps_all["ygo_hand_candidate"];
  const selectedSetss = options.map(d => d.split(seps1[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[1]));
  const min_maxss = options.map(d => d.split(seps1[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[0]));
  let judges = [];
  let ids = { searcher: [], searched: [] }
  if (localStorage.ygo_searchId) {
    ids = JSON.parse(localStorage.ygo_searchId);
  }

  for (i = 0; i < selectedSetss.length; i++) {
    let selectedSets = selectedSetss[i];
    let min_maxs = min_maxss[i];
    let ids_sums_tmp = ygo_search(selectedSets);
    if (include_search) {
      for (_ of Array(10)) {
        ids_sums_tmp = ygo_search_check_2(ids_sums_tmp, ids);
      }
    }
    if (!ids_sums_tmp) continue;
    let ids_sums_filtered = ids_sums_tmp
      .map(d => Array.from(new Set(d)))
      .map(d => d.filter(dd => initial_ids.includes(dd)));
    let array_tmp = [];
    ids_sums_filtered.forEach(d => array_tmp = array_tmp.concat(d));
    const keys_tmp = Array.from(new Set(array_tmp));
    let counts_tmp = Array(keys_tmp.length);
    keys_tmp.forEach((key, index) => counts_tmp[index] = array_tmp.filter(d => d == key).length);
    counts_tmp.forEach((count, index) => {
      if (count > 1) ids_sums_filtered = ids_sums_filtered.map(d => {
        if (d.indexOf(keys_tmp[index]) != -1 && d.length == 1) return [];
        else return d;
      })
    });
    const judge_tmps = ids_sums_filtered.map((d, index) => {
      const tmp_length = d.length;
      const min_max = min_maxs[index].split("-");
      let judge = true;
      if (min_max[0] != "") if (Number(min_max[0]) > tmp_length) judge = false;
      if (min_max[1] != "") if (Number(min_max[1]) < tmp_length) judge = false;
      return judge;
    });
    judges.push(judge_tmps.every(d => d));
  }
  return judges.map(d => {
    if (d) return "O";
    else return "X";
  });
}

function ygo_search(selectedSets, limited_ids = ["fromDeck"]) {
  if (!selectedSets || !selectedSets[0]) return [];
  let data_main = limited_ids;
  const df=GLOBAL_df;
  if (!df) return;
  let df_deck = df;
  if (limited_ids[0] == "fromAllCards") {
    data_main = df.toDict()["id"];
  }
  if (limited_ids[0] == "fromDeck") data_main=GLOBAL_data_main;
  if (!data_main) return [];
  if (limited_ids[0] != "fromAllCards") df_deck = df.filter(row => data_main.indexOf(row.get("id")) != -1);

  const seps = seps_all["ygo_set"];
  const seps2 = seps_all["ygo_set_candidate"];
  const card_sentences = selectedSets.map(d => d.split(seps[1])[1].split(seps2[2]));

  const ids_sums = card_sentences.map(card_sentence => {
    let ids_sum = [data_main];
    let ids_tmp = [];
    let paren_andOrs=[];
    let paren_depth=0;
    for(d of card_sentence) {
      d_list = d.split(",");
      if (d_list[1] == "(") {
        paren_depth+=1;
        ids_sum.push(data_main);
        paren_andOrs.push(d_list[0]);
        continue;
      }else if (d_list[1] == ")") {
        if (/ |And/.test(paren_andOrs[paren_depth-1]))
          ids_sum[paren_depth-1] = ids_sum[paren_depth-1].filter(ind => ids_sum[paren_depth].indexOf(ind) != -1);
        else if (/Or/.test(paren_andOrs[paren_depth-1]))
          ids_sum[paren_depth-1] = data_main.filter(ind => ids_sum[paren_depth].indexOf(ind) != -1 || ids_sum[paren_depth-1].indexOf(ind) != -1);
        paren_depth-=1;
        ids_sum.pop();
        paren_andOrs.pop();
        continue;
      }
      relation_tmp = d_list[2];
      andOr_tmp = d_list[0];
      if (relation_tmp == ">") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && Number(row.get(d_list[1])) > Number(d_list[3])).toDict()["id"];
      else if (relation_tmp == "<") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && Number(row.get(d_list[1])) < Number(d_list[3])).toDict()["id"];
      else if (relation_tmp == "==") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && row.get(d_list[1]) == d_list[3]).toDict()["id"];
      else if (relation_tmp == "!=") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && row.get(d_list[1]) != d_list[3]).toDict()["id"];
      else if (relation_tmp == "include") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && row.get(d_list[1]).indexOf(d_list[3]) != -1).toDict()["id"];
      else if (relation_tmp == "not include") ids_tmp = df_deck.filter(row => row.get(d_list[1]).replace("NaN", "") && row.get(d_list[1]).indexOf(d_list[3]) == -1).toDict()["id"];
      if (!ids_tmp) ids_tmp = [];
      if (/ |And/.test(andOr_tmp)) ids_sum[paren_depth] = ids_sum[paren_depth].filter(ind => ids_tmp.indexOf(ind) != -1);
      else if (/Or/.test(andOr_tmp)) ids_sum[paren_depth] = data_main.filter(ind => ids_tmp.indexOf(ind) != -1 || ids_sum[paren_depth].indexOf(ind) != -1);
    };
    if (!ids_sum[0] || ids_sum[0] == [""]) ids_sum = ["noMatch"];
    return ids_sum[0];
  });
  localStorage.ids_sums = ids_sums.map(d => d.join(",")).join("\n");
  return ids_sums;
}

function ygo_search_check_1() {
  const seps = seps_all["ygo_search"];
  before_ygo_search_tmp = operate_storage("ygo_search", "obtain").map(d => d.split(seps[1])[1]);
  const seps2 = seps_all["ygo_search_candidate"];

  let ids_tmp = { From: [], To: [] };
  for (key of Object.keys(ids_tmp)) {
    ids_tmp[key] = before_ygo_search_tmp.map(d =>
      d.split(seps2[2]).filter(dd => dd.split(seps2[1])[0] == key)
        .map(dd => dd.split(seps2[1])[1]));
  }
  let ids_tmp2 = { From: [], To: [] };
  for (key of Object.keys(ids_tmp2)) {
    for (card of ids_tmp[key]) {
      tmp_ids = ygo_search(card)[0];
      ids_tmp2[key].push(Array.from(new Set(tmp_ids)));
    }
  }

  return { searcher: ids_tmp2["From"], searched: ids_tmp2["To"] };
}

function ygo_search_check_2(ids_sums_tmp, ids) {
  let ids_add = [];
  if (!ids_sums_tmp) return;
  return Array.from(new Set(
    ids_sums_tmp.map((ids_sum) => {
      ids_add = [];
      for (index = 0; index < ids.searched.length; index++) {
        if (ids.searched[index].some(dd => ids_sum.indexOf(dd) != -1))
          ids_add = ids_add.concat(ids.searcher[index]);
      }
      return ids_sum.concat(ids_add);
    })));
}

function calc_from_hands(hands, initial_idss, output_id = "") {
  const seps = seps_all["ygo_hand"];
  const seps2 = seps_all["ygo_hand_candidate"];
  let ids = { searcher: [], searched: [] }
  if (localStorage.ygo_searchId) {
    ids = JSON.parse(localStorage.ygo_searchId);
  }
  const selectedSetss = hands.map(d => d.split(seps[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[1]));
  const min_maxss = hands.map(d => d.split(seps[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[0]));
  let ids_sums_tmps = [];

  for (selectedSets of selectedSetss) ids_sums_tmps.push(ygo_search(selectedSets));

  let judgess = [];
  let count_tmp = 0;
  const cycle_number = initial_idss.length;
  for (initial_ids of initial_idss) {
    count_tmp = count_tmp + 1;
    if (output_id && count_tmp % 500 == 10) $(`#${output_id}`).val(`Process : ${count_tmp} / ${cycle_number}`)
    judgess.push(ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, true, ids));
  }
  return judgess;
}


$(async function () {
  $("#ygo_calc0_result_card1").val("1");
  localStorage.default_deck_names=await obtain_default_deck_names().then(d=>d.join(","));
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  GLOBAL_df=df;
  $("#ygo_calc0_result_card1").val("2");

  //const deck_name = obtain_uploaded_deck(true)[0];
  //GLOBAL_deck_data = await obtain_default_deck_data("zzz_magician6.43.ydk");
  //GLOBAL_data_main = await obtain_main_deck();
  $("#ygo_calc0_result_card1").val("3");

  const default_keys = Object.keys(df.toDict());
  localStorage.default_keys = default_keys.join(",");
  const initialList = "Hand";
  $("#ygo_input_list").val(initialList);
  remake_option(lowerList[initialList.toLowerCase()].map(d => d[0].toUpperCase() + d.slice(1)).concat(default_keys), "ygo_calc3_input_item");
  $("#ygo_calc0_result_card1").val("4");

});