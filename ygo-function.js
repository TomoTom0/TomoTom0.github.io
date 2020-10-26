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

const listAddition = { search: ["From", "To"], set: ["And", "Or"] };
const lowerList = { set: ["set"], hand: ["set", "hand"], group: ["set", "hand", "group"], search: ["set"] }

function presskey(code, calc_id){
	if(13 === code){
    if (calc_id=="3_add"){
      $("#ygo_calc3_button_add").trigger("click");
    }
    else if (calc_id=="5_rename"){
      $("#ygo_calc5_button_rename").trigger("click");
    }
	}
}

function remake_option(options, select_id, overWrite = true, values = [], form = "select") {
  const select_id_re = select_id.replace(/^#/, "");
  const select = $(`#${select_id_re}`);
  if (overWrite) $(`${form}#${select_id_re} option`).remove();
  if (values == [] || values.length != options.length) values = options;
  for (let i = 0; i < options.length; i++) {
    const option = $("<option>").text(options[i]).val(values[i]);
    select.append(option);
  }
}

function obtain_uploaded_deck(obtain_name = false, deck_name = null) {
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck")) before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
  const deck_names = before_ygo_uploaded_deck.map(d => d.split(seps[1])[0]);
  if (obtain_name) return deck_names;
  else if (deck_name) {
    if (deck_names.indexOf(deck_name) != -1) return before_ygo_uploaded_deck.filter(d => d.split(seps[1])[0] == deck_name)[0].split(seps[1])[1];
    else return "";
  }
  else return before_ygo_uploaded_deck;
}

async function obtain_main_deck(raw_data = false) {
  const deck_name = $("#ygo_calc0_input_deck").val();
  if (!deck_name) return [];

  let data = "";
  if (obtain_uploaded_deck(obtain_name = true).indexOf(deck_name) != -1) {
    data = obtain_uploaded_deck(false, deck_name);
  }
  else {
    const file_url = `data/ProjectIgnis/deck/${deck_name}`;
    data = await fetch(file_url).then(res => res.text())
  }
  let data_tmp = data.replace(/\r\n|\r(?=[^\n])/g, "\n").split("\n").filter(d=>d);

  if (raw_data) return data_tmp;
  const main_index = data_tmp.indexOf("#main");
  const extra_index = data_tmp.indexOf("#extra");
  return data_tmp
    .filter((_, index) => index > main_index && index < extra_index)
    .filter(d => !d.startsWith("#"));
}

async function translate_deck(deck_name = "", file_format = "deck-id") {
  if (!deck_name) return [];
  let deck_data = await obtain_main_deck(true);
  if (file_format != "deck-id") {
    let df = await dfjs.DataFrame.fromCSV(ygo_db_url);
    const orig_format = file_format.replace(/^deck-/, "");
    deck_data = deck_data.map(id => {
      if (/^#|^\s*$|^!/.test(id)) return id;
      else return df.filter(row => row.get("id") == id).toDict()[orig_format][0];
    });
  }
  return deck_data;
}

async function remake_all() {
  const input_ids = {
    item: "ygo_calc1_input_item",
    condition: "ygo_calc1_input_condition",
    keyword_list: "ygo_calc1_input_keywordlist",
  };
  await remake_itemConditionKey_options(input_ids);
  remake_calc3_result();
  remake_calc3_option();
  localStorage.ygo_searchId = JSON.stringify(await ygo_search_check_1().then(_ => _));
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
  const selected_item = $(`#${input_ids.item}`).val();
  if (change_condition) {
    const options_numbers = ["==", "!=", ">", "<"];
    const options_limited_strings = ["==", "!="];
    const options_unlimited_strings = ["==", "!=", "include", "not include"];
    let options = [];
    if (item_numbers.indexOf(selected_item) != -1) {
      options = options_numbers;
    } else if (item_limited_strings.indexOf(selected_item) != -1) {
      options = options_limited_strings;
    } else options = options_unlimited_strings;
    remake_option(options, input_ids.condition, (overWrite = true));
  }

  const data_main = await obtain_main_deck().then(_ => _);
  if (data_main == [] || !selected_item) return;
  let sorted_array_tmp = await dfjs.DataFrame.fromCSV(ygo_db_url)
    .then(df => {
      try {
        return df.filter(row => data_main.indexOf(row.get("id")) != -1)
          .toDict()[selected_item].slice().sort();
      }
      catch { return []; }
    });

  const selected_condition = $(`#${input_ids.condition}`).val();
  if (selected_item == "type" && ["include", "not include"].indexOf(selected_condition) != -1) {
    sorted_array_tmp.map(d => [...d.split(" ")]);
  }
  let options_key = Array.from(new Set([...sorted_array_tmp])).slice().sort();
  remake_option(options_key, input_ids.keyword_list, true, [], "");
}

async function remake_calc0_result() {
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck"))
    before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
  let options = before_ygo_uploaded_deck.map(d => d.split(seps[1])[0]);
  remake_option(options, "ygo_calc0_input_anotherDeck");
  remake_option(options, "ygo_calc0_input_deck");
  fetch("data/ProjectIgnis/deck/ydks.dat")
    .then(res => res.text())
    .then(data => data.split("\n"))
    .then(async (fileList) => {
      remake_option(fileList, "ygo_calc0_input_deck", false);
      remake_option(fileList, "ygo_calc0_input_anotherDeck", false);
    })
}

async function remake_calc3_option(change_condition = true, change_item = true, change_addition = true) {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const selectedItem = $("#ygo_calc3_input_item").val();

  if (change_addition){
    if (Object.keys(listAddition).indexOf(selectedList) != -1) {
      remake_option(listAddition[selectedList], "ygo_calc3_input_addition");
    }
    else remake_option([], "ygo_calc3_input_addition");
  }
  if (change_item) {
    default_keys = localStorage.default_keys.split(",");
    remake_option(lowerList[selectedList].map(d => d[0].toUpperCase() + d.slice(1)).concat(default_keys), "ygo_calc3_input_item");
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
    await remake_itemConditionKey_options(input_ids, change_condition);
  }
}


async function remake_calc3_result() {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const candidates = operate_storage(`ygo_${selectedList}_candidate`, "obtain");
  seps=seps_all[`ygo_${selectedList}_candidate`];
  $("#ygo_calc3_result_card1").html(candidates.join("<br><br>").replace(new RegExp(`${seps[1]}|__|\n`, "g"), "<br>")
    .replace(/:::::|::::|:::/g, "_").replace(/,/g, " ").replace(/_._/g, "_"));
  seps2=seps_all[`ygo_${selectedList}`];
  const results = operate_storage(`ygo_${selectedList}`, "obtain");
  $("#ygo_calc3_result_card2").html(results.join("<br><br>").replace(new RegExp(`${seps2[1]}|__|\n`, "g"), "<br>")
  .replace(/_____|____|___|__/g, "<br>").replace(/:::::|::::|:::/g, "_").replace(/,/g, " ").replace(/_\._|\._|_\./g, "_"));
  if (selectedList == "search") localStorage.ygo_searchId = JSON.stringify(await ygo_search_check_1());
}
async function remake_calc5_search_result() {
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  let ids_sum = [];
  if (sessionStorage.ids_sums)
    ids_sum = sessionStorage.ids_sums.split("\n")[0].split(",");
  if ($("#ygo_calc5_check_search_include:checked").val() == "on") {
    let ids = { searcher: [], searched: [] }
    if (localStorage.ygo_searchId) {
      ids = JSON.parse(localStorage.ygo_searchId);
    }
    for (_ of Array(10)) {
      ids_sum = await ygo_search_check_2([ids_sum], ids).then(d => d[0]);
    }
  }
  const data_main = await obtain_main_deck().then(_ => _);
  let ids_sum2 = [];
  if ($("#ygo_calc5_check_search_all:checked").val() == "on") ids_sum2 = ids_sum;
  else ids_sum2 = data_main.filter(d => ids_sum.indexOf(d) != -1);
  if ($("#ygo_calc5_check_search_unique:checked").val() == "on")
    ids_sum2 = Array.from(new Set(ids_sum2));
  let content = ids_sum2
    .map(id => df.filter(row => row.get("id") === id).toDict()["name_Jap"][0]).slice().sort();
  const selectedList = $("#ygo_calc5_input_list").val();
  const selectedContent = $("#ygo_calc5_input_listContent").val();
  if (selectedList != "Set" || !selectedContent) content = ["Valid SET should be selected."];
  $("#ygo_calc5_result_card2").html("Search Results<br>" + content.join("<br>"));
}

async function remake_calc5_result_draw() {
  //let before_ygo_groups=operate_storage("ygo_group", "obtain");
  let before_ygo_hands = operate_storage("ygo_hand", "obtain");

  let initial_hand = [];
  let initial_ids = [];
  if (localStorage.ygo_tryDraw) {
    ygo_tryDraw = JSON.parse(localStorage.ygo_tryDraw);
    initial_hand = ygo_tryDraw.initial_hand.split(",");
    initial_ids = ygo_tryDraw.random_ids.split(",").slice(0, initial_hand.length);
  }
  const judges_hands = await ygo_judge(before_ygo_hands, initial_ids, true).then(_ => _);
  //const judges_groups=await ygo_judge(before_ygo_hands, initial_ids, include_search=true).then(_=>_);

  const seps = seps_all["ygo_hand"];
  const options_new = before_ygo_hands.map((d, index) => ` ${d.split(seps[1])[0]}<br>---${judges_hands[index]}`);
  $("#ygo_calc5_result_card2").html("Draw Cards<br>" + initial_hand.join("<br>"));
  $("#ygo_calc5_result_card1").html(options_new.join("<br>").replace(/:::::|::::|:::/g, "_").replace(/\n/g, "<br>").replace(/,/g, " ").replace(/_._/g, "_"));
}


async function remake_calc5_result() {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();

  let values = operate_storage(`ygo_${selectedList}`, "obtain");
  const options = values.map(d => d.replace(/:::::|::::|:::/g, "_").replace(/_____|____|___/g, "_").replace(/,/g, " ").replace(/_._/g, "_"));
  remake_option(options, "ygo_calc5_input_listContent", true, values);
}

async function ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, include_search = true, ids) {
  let judges = [];
  if (include_search) {
    for (ids_sums_tmp of ids_sums_tmps) {
      for (_ of Array(10))
        ids_sums_tmp = await ygo_search_check_2(ids_sums_tmp, ids).then(d => d);
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
        const tmp_length=ids_sums_filtered.filter(d => {
        d.indexOf(keys_tmp[index]) != -1 && d.length == 1}).length;
        if (tmp_length > 1) ids_sums_filtered.map(d => {
          if (d.indexOf(keys_tmp[index]) != -1 && d.length == 1) return [];
        else return d;})
      }
    })
    const judge_tmps = ids_sums_filtered.map((d, index) => {
      tmp_length=d.length;
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

async function ygo_judge(options, initial_ids, include_search = false) {
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
    let ids_sums_tmp = await ygo_search(selectedSets).then(_ => _);
    if (include_search) {
      for (_ of Array(10)) {
        ids_sums_tmp = await ygo_search_check_2(ids_sums_tmp, ids).then(d => d);
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
      const tmp_length=d.length;
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

async function ygo_search(selectedSets, limited_ids = ["fromDeck"]) {
  if (!selectedSets || !selectedSets[0]) return [];
  let data_main = limited_ids;
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  let df_deck=df;
  if (limited_ids[0] == "fromAllCards") {
    data_main=df.toDict()["id"];
  }
  if (limited_ids[0] == "fromDeck") data_main = await obtain_main_deck().then(_ => _);
  if (limited_ids[0] != "fromAllCards") df_deck = df.filter(row => data_main.indexOf(row.get("id")) != -1);

  const seps = seps_all["ygo_set"];
  const seps2 = seps_all["ygo_set_candidate"];
  const card_sentences = selectedSets.map(d => d.split(seps[1])[1].split(seps2[2]));
 
  const ids_sums = card_sentences.map(card_sentence => {
    let ids_sum = data_main;
    let ids_tmp = [];
    card_sentence.forEach(d => {
      d_list = d.split(",");
      relation_tmp = d_list[1];
      andOr_tmp = d_list[3];
      if (relation_tmp == ">") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && Number(row.get(d_list[0])) > Number(d_list[2])).toDict()["id"];
      if (relation_tmp == "<") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && Number(row.get(d_list[0])) < Number(d_list[2])).toDict()["id"];
      if (relation_tmp == "==") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && row.get(d_list[0]) === d_list[2]).toDict()["id"];
      if (relation_tmp == "!=") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && row.get(d_list[0]) !== d_list[2]).toDict()["id"];
      if (relation_tmp == "include") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && row.get(d_list[0]).indexOf(d_list[2]) != -1).toDict()["id"];
      if (relation_tmp == "not include") ids_tmp = df_deck.filter(row => row.get(d_list[0]) != "NaN" && row.get(d_list[0]).indexOf(d_list[2]) == -1).toDict()["id"];
      if (!ids_tmp) ids_tmp = [];
      if (andOr_tmp == "And") ids_sum = ids_sum.filter(ind => ids_tmp.indexOf(ind) != -1);
      if (andOr_tmp == "Or") ids_sum = data_main.filter(ind => ids_tmp.indexOf(ind) != -1 || ids_sum.indexOf(ind) != -1);
    });
    if (!ids_sum || ids_sum == [""]) ids_sum = ["noMatch"];
    return ids_sum;
  });
  sessionStorage.ids_sums = ids_sums.map(d => d.join(",")).join("\n");
  return ids_sums;
}

async function ygo_search_check_1() {
  const seps = seps_all["ygo_search"];

  before_ygo_search_tmp = operate_storage("ygo_search", "obtain").map(d => d.split(seps[1])[1]);

  const seps2 = seps_all["ygo_search_candidate"];
  const seps3 = seps_all["ygo_set"];

  let ids_tmp = { From: [], To: [] };
  for (key of Object.keys(ids_tmp)) {
    ids_tmp[key] = before_ygo_search_tmp.map(d =>
      d.split(seps2[2]).filter(dd => dd.split(seps2[1])[0] == key)
        .map(dd => dd.split(seps2[1])[1]));
  }
  let ids_tmp2 = { From: [], To: [] };
  for (key of Object.keys(ids_tmp2)) {
    for (card of ids_tmp[key]) {
      tmp_ids = await ygo_search(card).then(d => d[0]);
      ids_tmp2[key].push(Array.from(new Set(tmp_ids)));
    }
  }

  return { searcher: ids_tmp2["From"], searched: ids_tmp2["To"] };
}

async function ygo_search_check_2(ids_sums_tmp, ids) {
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

async function calc_from_hands(hands, initial_idss, output_id="") {
  const seps = seps_all["ygo_hand"];
  const seps2 = seps_all["ygo_hand_candidate"];
  let ids = { searcher: [], searched: [] }
  if (localStorage.ygo_searchId) {
    ids = JSON.parse(localStorage.ygo_searchId);
  }
  const selectedSetss = hands.map(d => d.split(seps[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[1]));
  const min_maxss = hands.map(d => d.split(seps[1])[1].split(seps2[2]).map(dd => dd.split(seps2[1])[0]));
  let ids_sums_tmps = [];

  for (selectedSets of selectedSetss) ids_sums_tmps.push(await ygo_search(selectedSets));

  let judgess = [];
  let count_tmp = 0;
  const cycle_number = initial_idss.length;
  for (initial_ids of initial_idss) {
    count_tmp = count_tmp + 1;
    if (output_id && count_tmp%500==10) $(`#${output_id}`).val(`Process : ${count_tmp} / ${cycle_number}`)
    judgess.push(await ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, true, ids));
  }
  return judgess;
}

$(async function () {
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  const default_keys = Object.keys(df.toDict());
  localStorage.default_keys = default_keys.join(",");
  const initialList = "Set";
  $("#ygo_input_list").val(initialList);
  remake_option(lowerList[initialList.toLowerCase()].map(d => d[0].toUpperCase() + d.slice(1)).concat(default_keys), "ygo_calc3_input_item");

  //if (!localStorage.deck_name) $("#ygo_calc0_input_deck").val(localStorage.deck_name);
  $("#ygo_calc3_input_item").val("name_Jap");

  remake_option([], "ygo_calc0_input_deck");
  remake_option([], "ygo_calc0_input_anotherDeck");

  await remake_calc0_result();
  remake_calc3_result();
  localStorage.ygo_searchId = JSON.stringify(await ygo_search_check_1().then(_=>_));
  remake_calc3_option(true, false, true);
  remake_calc5_result();

});

$("#ygo_calc0_up").on("change", async function () {
  $("#ygo_calc0_result_card1").val("Uploading ...");
  files_tmp = await this.files;
  const seps = seps_all["ygo_uploaded_deck"];

  let uploaded_data = [];
  for (file_tmp of files_tmp) uploaded_data.push(`${file_tmp.name}${seps[1]}${await file_tmp.text()}`);
  const file_format = $("#ygo_calc0_input_fileFormat").val();
  if (/^deck/.test(file_format)) {
    let before_ygo_uploaded_deck = [];
    if (localStorage.getItem("ygo_uploaded_deck"))
      before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
    const deck_names = before_ygo_uploaded_deck.map(d => d.split(seps[1])[0])
    if (file_format != "deck-id") {
      let df = await dfjs.DataFrame.fromCSV(ygo_db_url);
      const orig_format = file_format.replace(/^deck-/, "");
      uploaded_data = uploaded_data.map(data_tmp => {
        let d_splited = data_tmp.split(seps[1]);
        try {
          d_splited[1].map(dd => {
            if (/^#/.test(dd)) return dd;
            else return df.filter(row => row.get(orig_format) == dd).toDict()["id"][0];
          });
        } catch {
          $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + `<br> error occured with ${d_splited[0]}`);
          d_splited[1] = [];
        }
        return d_splited.join(seps[1]);
      });
    }
    uploaded_data = uploaded_data.map(d => {
      let deck_name = d.split(seps[1])[0];
      if (deck_names.indexOf(deck_name) != -1) {
        let extension_tmp = deck_name.match(/\.[^.\s]*$/);
        if (!extension_tmp) extension_tmp = "";
        let main_name_tmp = deck_name.replace(/\.[^.\s]*$/, "");
        let tmp_number = deck_names.filter(d => d.replace(/_\d+\.[^.\s]*$/, "") == deck_name).length;
        let new_deck_name = `${main_name_tmp}_${tmp_number}${extension_tmp}`;
        while (deck_names.indexOf(new_deck_name) != -1) {
          let tmp_number = tmp_number + 1;
          new_deck_name = `${main_name_tmp}_${tmp_number}${extension_tmp}`;
        }
        deck_name = new_deck_name;
      }
      return `${deck_name}${seps[1]}${d.split(seps[1])[1]}`;
    })
    const valid_data = uploaded_data.filter(d => d.split(seps[1])[1]);
    before_ygo_uploaded_deck = before_ygo_uploaded_deck.concat(valid_data);

    $("#ygo_calc0_result_card1").html("Uploaded ... " + valid_data.map(d => d.split(seps[1])[0]).join("<br>"))
    localStorage["ygo_uploaded_deck"] = before_ygo_uploaded_deck.join(seps[2]);
    await remake_calc0_result();
  } else if (/^cache/.test(file_format)) {
    //remake cache
  }
});

$("#ygo_calc0_down").on("click", async function () {
  const file_format = $("#ygo_calc0_input_fileFormat").val();
  const dl_file = $("#ygo_calc0_input_deck").val();
  let dl_name = "";
  let dl_data = "";
  $("#ygo_calc0_result_card1").val("Downloading ...");
  if (/^deck-/.test(file_format)) {
    const orig_format = file_format.replace(/^deck-/, "");
    $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + dl_file);
    dl_data = await translate_deck(dl_file, file_format).then(d => d.join("\r\n"));
    if (file_format != "deck-id") dl_name = `${orig_format}-${dl_file}`;
    else dl_name = dl_file;
    $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + " translated ...");
  }
  else if (/^cache/.test(file_format)) {
    dl_name = file_format + ".json";
    let dic_tmp = {};
    let content_tmp = [];
    let seps_tmp = [];
    for (key of Object.keys(seps_all)) {
      seps_tmp = seps_all[key];
      if (file_format == "cache-limited") {
        content_tmp = localStorage.getItem(key);
        if (content_tmp) dic_tmp[key] = content_tmp.split(seps_tmp[2]).filter(d => d.split(seps_tmp[0])[0] == dl_file).join(seps_tmp[2]);
      }
      else if (/^cache-all/.test(file_format)) dic_tmp[key] = localStorage.getItem(key);
    }
    if (file_format == "cache-all_including_deck") dic_tmp["ygo_uploaded_deck"] = localStorage.getItem("ygo_uploaded_deck");
    dl_data = JSON.stringify(dic_tmp);
    $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + file_format);
  }
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, dl_data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = dl_name;
  a.href = url;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

$("#ygo_calc0_input_deck").on("click", async function () {
  localStorage.deck_name = $("#ygo_calc0_input_deck").val();
  await remake_all();
});

$("#ygo_calc0_button_preview").on("click", async function () {
  const file_format = $("#ygo_calc0_input_fileFormat").val();
  const deck_name = $("#ygo_calc0_input_deck").val();
  const deck_data = await translate_deck(deck_name, file_format);
  $("#ygo_calc0_result_card1").html(deck_data.join("<br>"));
});

$("#ygo_calc0_button_delete").on("click", async function () {
  const deck_name = $("#ygo_calc0_input_deck").val();

  //and its settings
  const warning_message = `WARNING : ${deck_name} will be deleted.
  <br>If you want to delete, please push DELETE again.
  <br>If you cancel, push another button as like CLEAR.`
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck"))
    before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
  if (before_ygo_uploaded_deck.every(d => d.split(seps[1])[0] != deck_name)) {
    $("#ygo_calc0_result_card1").html(`${deck_name} is not uploaded deck,<br>so you can't delete it.`)
  }
  else if ($("#ygo_calc0_result_card1").html() == warning_message) {
    localStorage["ygo_uploaded_deck"] = before_ygo_uploaded_deck.filter(d => d.split(seps[1])[0] != deck_name).join(seps[2]);
    $("#ygo_calc0_result_card1").html(`${deck_name} has been deleted.`);
    await remake_calc0_result();
  }
  else $("#ygo_calc0_result_card1").html(warning_message);

});

$("#ygo_calc0_button_reset").on("click", function () {

  $("#ygo_calc0_result_card1").val("");
});

$("#ygo_calc0_button_deleteCaches").on("click", async function () {
  localStorage.clear();
});

//ygo_3


$("#ygo_calc3_input_list").on("change", function () {

  $("#ygo_calc3_input_addition").val("");
  remake_calc3_option(true, true, true);

  remake_calc3_result();
});

$("#ygo_calc3_input_item").on("click", async function () {
  $("#ygo_calc3_input_keyword").val("");

  remake_calc3_option(true, false, false);
});

$("#ygo_calc3_input_condition").on("click", async function () {
  $("#ygo_calc3_input_keyword").val("");
  remake_calc3_option(false, false, false);
});

$("#ygo_calc3_button_add").on("click", function () {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();

  const selectedItem = $("#ygo_calc3_input_item").val();
  const selectedCondition = $("#ygo_calc3_input_condition").val();
  const selectedKeyword = $("#ygo_calc3_input_keyword").val();
  const selectedAddition = $("#ygo_calc3_input_addition").val();
  let min_number = $("#ygo_calc3_input_minNumber").val();
  const max_number = $("#ygo_calc3_input_maxNumber").val();

  let name = null;
  if (selectedList == "hand") {
    if (!min_number && !max_number) min_number = 1;
    name = `${min_number}-${max_number}`;
  }
  else if (selectedList == "search") {
    name = selectedAddition;
  }

  const listArray_in = ["set", "hand", "group"];
  const listDict_out = { set: 0, hand: 1, group: 2, search: 1 };
  let list_index_in = 0;
  let storage_key = "";
  if (localStorage.default_keys.indexOf(selectedItem) != -1) {
    list_index_in = 0;
    let andOr = selectedAddition;
    if (selectedList != "set" || !andOr) andOr = "And";
    content = [selectedItem, selectedCondition, selectedKeyword, andOr].join(",");
  }
  else if (["Set", "Hand", "Group"].indexOf(selectedItem) != -1) {
    list_index_in = listArray_in.indexOf(selectedItem.toLowerCase());
    storage_key = `ygo_${selectedItem.toLowerCase()}`;
    content = selectedKeyword.split(seps_all[storage_key][1])[1];
  }
  const list_index_out = listDict_out[selectedList];

  if (list_index_in == list_index_out) {
    storage_key = `ygo_${listArray_in[list_index_in]}`;
    for (content_tmp of content.split(seps_all[storage_key][2])) {
      operate_storage(`ygo_${selectedList}_candidate`, "add", content_tmp, name);
    }
  }
  else {
    for (list_index = list_index_in; list_index < list_index_out; list_index++) {
      storage_key = `ygo_${listArray_in[list_index]}`;
      content = `.${seps_all[storage_key][1]}${content}`;
    }
    operate_storage(`ygo_${selectedList}_candidate`, "add", content, name);
  }

  remake_calc3_result();
  $("#ygo_calc3_input_minNumber").val("");
  $("#ygo_calc3_input_maxNumber").val("");
  $("#ygo_calc3_input_keyword").val("");
});

$("#ygo_calc3_button_reset").on("click", function () {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  operate_storage(`ygo_${selectedList}_candidate`, "deleteAll");

  remake_calc3_result();
  $("#ygo_calc3_input_minNumber").val("");
  $("#ygo_calc3_input_maxNumber").val("");
  $("#ygo_calc3_input_keyword").val("");
});

$("#ygo_calc3_button_erase").on("click", function () {
  remake_calc3_result();
  $("#ygo_calc3_input_minNumber").val("");
  $("#ygo_calc3_input_maxNumber").val("");
  $("#ygo_calc3_input_keyword").val("");
});

$("#ygo_calc3_button_sync").on("click", async function () {
  const selectedKeyword = $("#ygo_calc3_input_keyword").val();
  const before_storage=operate_storage("ygo_set", "obtain");

  remake_calc3_result();
  remake_calc3_option(true, false);
  remake_calc5_result();
});

$("#ygo_calc3_button_undo").on("click", function () {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const last_candidate = operate_storage(`ygo_${selectedList}_candidate`, "obtain").slice(-1)[0];
  if (last_candidate) operate_storage(`ygo_${selectedList}_candidate`, "delete", last_candidate);
  remake_calc3_result();
});

$("#ygo_calc3_button_submit").on("click", function () {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  let name = $("#ygo_calc3_input_name").val();
  if (!name) {
    name = `${selectedList[0].toUpperCase()}-${operate_storage(`ygo_${selectedList}`, "obtain").length + 1}`;
  }
  operate_storage(`ygo_${selectedList}_candidate`, "submit", null, name, `ygo_${selectedList}`);

  $("#ygo_calc3_input_name").val("");
  $("#ygo_calc3_input_keyword").val("");

  remake_calc3_result();
  remake_calc5_result();
});

$("#ygo_calc5_input_list").on("change", function () {
  remake_calc5_result();
});

$("#ygo_calc5_button_draw").on("click", async () => {
  const data_main = await obtain_main_deck().then(_ => _);

  const deck_size = data_main.length;
  const random_tmp = [...Array(deck_size).keys()].map(_ => Math.random());
  const random_number = random_tmp.slice().sort().map(d => random_tmp.indexOf(d));
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url).then(_ => _);
  const random_ids = random_number.map(d => data_main[d]);

  if (!data_main) return;
  const initial_hand = random_number
    .slice(0, 5).map(d => data_main[d])
    .map(ind => df.filter(row => row.get("id") == ind).toDict()["name_Jap"][0]);
  localStorage.ygo_tryDraw = JSON.stringify({
    random_ids: random_ids.join(","),
    initial_hand: initial_hand.join(","),
  });
  remake_calc5_result_draw();
});

$("#ygo_calc5_button_calc").on("click", async function () {
  const data_main = await obtain_main_deck().then(_ => _);
  const deck_size = data_main.length;
  $("#ygo_calc5_result_card1").html("Process .");

  const cycle_number = 1000;
  const initial_idss = [...Array(cycle_number).keys()].map(cycle_now => {
    if (cycle_now==Number(cycle_number/2)) $("#ygo_calc5_result_card1").html("Process ..");
    const random_tmp = [...Array(deck_size).keys()].map(__ => Math.random());
    const random_number = random_tmp.slice().sort().map(d => random_tmp.indexOf(d));
    return random_number.map(d => data_main[d]).slice(0, 5);
  });
  $("#ygo_calc5_result_card1").html("Process ...");

  const seps = seps_all["ygo_hand"];
  const hands = operate_storage("ygo_hand", "obtain");
  const hand_names = hands.map(d => d.split(seps[1])[0]);

  judgess = await calc_from_hands(hands, initial_idss, "ygo_calc5_result_card1");

  let counts = [];
  for (let index of [...Array(hands.length).keys()]) counts.push(judgess.map(d => d[index]).filter(d => d == "O").length);
  let output = counts.map((d, index) => `${hand_names[index]}<br>---${d} / ${cycle_number}`);

  const seps_g = seps_all["ygo_group"];
  const groups = operate_storage("ygo_group", "obtain");
  let group_name = "";
  let g_hands = [];
  for (group of groups) {
    group_name = group.split(seps_g[1])[0];
    g_hands = group.split(seps_g[1])[1].spilt(seps_g[2]);
    judgess_tmp = await calc_from_hands(g_hands, initial_idss);
    output.push(`${group_name}<br>---${judgess_tmp.filter(d => d.some(dd => dd == "O")).length} / ${cycle_number}`)
  }

  $("#ygo_calc5_result_card1").html("Probabilities<br>" + output.join("<br>"));
});

$("#ygo_calc5_button_search").on("click", async function () {
  const selectedList = $("#ygo_calc5_input_list").val();
  const selectedContent = $("#ygo_calc5_input_listContent").val();

  let seps = seps_all["ygo_set"];
  let content = "";
  if (selectedList == "Set" && selectedContent) content = `${selectedContent.split(seps[1])[1]}`;
  if ($("#ygo_calc5_check_search_all:checked").val() == "on") await ygo_search([`.${seps[1]}${content}`], ["fromAllCards"]);
  else await ygo_search([`.${seps[1]}${content}`]);

  remake_calc5_search_result();
});


$("#ygo_calc5_button_rename").on("click", function () {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();
  const selectedContent = $("#ygo_calc5_input_listContent").val();
  const name = $("#ygo_calc5_input_name").val();

  operate_storage(`ygo_${selectedList}`, "rename", selectedContent, name);
  remake_calc5_result();
  remake_calc3_result();
  $("#ygo_calc5_input_name").val("");

});

$("#ygo_calc5_button_erase").on("click", function () {
  $("#ygo_calc5_input_name").val("");
});

$("#ygo_calc5_button_delete").on("click", function () {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();
  const selectedContent = $("#ygo_calc5_input_listContent").val();

  operate_storage(`ygo_${selectedList}`, "delete", selectedContent);
  remake_calc5_result();
  remake_calc3_result();

});

$("#ygo_calc5_button_deleteAll").on("click", function () {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();

  operate_storage(`ygo_${selectedList}`, "deleteAll");
  remake_calc5_result();
  remake_calc3_result();

});

let popups = ["0", "3", "5"].map(d=> document.querySelector(`#ygo_calc${d}_popup`));
popups.forEach((popup, index)=> {
  //let showDialogButton=$(`#ygo_calc${[0,3,5][index]}_popup_button_open`);
  if (! popup.showModal) dialogPolyfill.registerDialog(popup);
})
$("#ygo_calc0_popup_button_open").on("click", ()=>{
  $("#ygo_calc0_popup_content").html($("#ygo_calc0_result_card1").html());
  popups[0].showModal();
})
$("#ygo_calc0_popup_button_close").on("click", ()=>{
  popups[0].close();
})
$("#ygo_calc3_popup_button_open").on("click", ()=>{
  $("#ygo_calc3_popup_content1").html($("#ygo_calc3_result_card1").html());
  $("#ygo_calc3_popup_content2").html($("#ygo_calc3_result_card2").html());

  popups[1].showModal();
})
$("#ygo_calc3_popup_button_close").on("click", ()=>{
  popups[1].close();
})
$("#ygo_calc5_popup_button_open").on("click", ()=>{
  $("#ygo_calc5_popup_content1").html($("#ygo_calc5_result_card1").html());
  $("#ygo_calc5_popup_content2").html($("#ygo_calc5_result_card2").html());
  popups[2].showModal();
})
$("#ygo_calc5_popup_button_close").on("click", ()=>{
  popups[2].close();
})