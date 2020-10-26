const seps_all = {
  ygo_uploaded_deck: [null, ":::", "___"],
  ygo_set_candidate: ["--", null, "\n"],
  ygo_set: ["---", ":::", "___"],
  ygo_search_candidate: ["----", "::::", "____"],
  ygo_search: ["-----", ":::::", "_____"],
  ygo_hand_candidate: ["----", "::::", "____"],
  ygo_hand: ["-----", ":::::", "_____"],
  ygo_group_candidate: ["------", "::::::", "______"],
  ygo_group: ["-------", ":::::::", "_______"],
};

const listAddition = { search: ["From", "To"], set: ["And", "Or"] };
const lowerList = { set: ["set"], hand: ["set", "hand"], group: ["set", "hand", "group"], search: ["set"] }

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

async function obtain_main_deck(raw_data = false) {
  const deck_name = $("#ygo_calc0_input_deck").val();
  const file_url = `data/ProjectIgnis/deck/${deck_name}`;
  return fetch(file_url)
    .then(res => res.text())
    .then(data => {
      const data_tmp = data.split("\r\n");
      if (raw_data) return data_tmp;
      const main_index = data_tmp.indexOf("#main");
      const extra_index = data_tmp.indexOf("#extra");
      return data_tmp
        .filter((_, index) => index > main_index && index < extra_index)
        .filter(d => !d.startsWith("#"));
    });
}

async function translate_deck(deck_name = "", file_format = "deck-id") {
  if (!deck_name) return [];
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck"))
    before_ygo_uploaded_deck = localStorage
      .getItem("ygo_uploaded_deck")
      .split(seps[2]);
  let deck_data = [];
  if (
    before_ygo_uploaded_deck
      .map(d => d.split(seps[1])[0])
      .indexOf(deck_name) != -1
  ) {
    deck_data = before_ygo_uploaded_deck
      .filter(d => d.split(seps[1])[0] == deck_name)
      .map(d => d.split(seps[1])[1])[0]
      .split("\r\n");
  } else deck_data = await obtain_main_deck((raw_data = true));
  if (file_format != "deck-id") {
    let df = await dfjs.DataFrame.fromCSV(ygo_db_url);
    const orig_format = file_format.replace(/^deck-/, "");
    deck_data = deck_data.map(id => {
      if (/^#|^\s*$|^!/.test(id)) return id;
      else
        return df.filter(row => row.get("id") == id).toDict()[orig_format][0];
    });
  }
  return deck_data;
}

function remake_all() {
  const input_ids = {
    item: "ygo_calc1_input_item",
    condition: "ygo_calc1_input_condition",
    keyword_list: "ygo_calc1_input_keywordlist",
  };
  remake_itemConditionKey_options(input_ids);
  remake_calc0_result();
  remake_calc3_result();
  remake_calc3_option();
  remake_calc5_result();
  remake_itemConditionKey_options(input_ids, false);
}

function output_localStorage() {
  let tmp_dic = {};
  for (key of Object.keys(seps_all)) {
    tmp_dic[key] = localStorage.getItem(key);
  }
  const data_json = JSON.stringify(tmp_dic);

  const blob = new Blob([data_json], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = "ygo.json";
  a.href = url;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    operate_storage(storage_key, "add", selected_sentence, new_name);
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
  if (!data_main || !selected_item) return;
  let sorted_array_tmp = await dfjs.DataFrame.fromCSV(ygo_db_url)
    .then(df =>
      df.filter(row => data_main.indexOf(row.get("id")) != -1)
        .toDict()[selected_item].slice().sort());

  const selected_condition = $(`#${input_ids.condition}`).val();
  if (selected_item == "type" && ["include", "not include"].indexOf(selected_condition) != -1) {
    sorted_array_tmp.map(d => [...d.split(" ")]);
  }
  let options_key = Array.from(new Set([...sorted_array_tmp])).slice().sort();
  remake_option(options_key, input_ids.keyword_list, true, [], "");
}

function remake_calc0_result() {
  const seps = seps_all["ygo_uploaded_deck"];
  let before_ygo_uploaded_deck = [];
  if (localStorage.getItem("ygo_uploaded_deck"))
    before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
  let options = before_ygo_uploaded_deck.map(d => d.split(seps[1])[0]);
  remake_option(options, "ygo_calc0_input_anotherDeck", false);
  remake_option(options, "ygo_calc0_input_deck", false);
}

function remake_calc3_option(change_condition = true, change_item = true) {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const selectedItem = $("#ygo_calc3_input_item").val();

  if (Object.keys(listAddition).indexOf(selectedList) != -1) {
    remake_option(listAddition[selectedList], "ygo_calc3_input_addition");
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
    remake_itemConditionKey_options(input_ids, change_condition);
  }
}

async function remake_calc5_search_result() {
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  let ids_sum = [];
  if (sessionStorage.ids_sums)
    ids_sum = sessionStorage.ids_sums.split("\n")[0].split(",");
  if ($("#ygo_calc5_check_search_include:checked").val() == "on") {
    const ids = JSON.parse(localStorage.ygo_searchSetId);
    for (_ of Array(10)) {
      ids_sum = await ygo_search_check_2([ids_sum], ids).then(d => d[0]);
    }
  }
  const data_main = await obtain_main_deck().then(_ => _);
  let ids_sum2 = data_main.filter(d => ids_sum.indexOf(d) != -1);
  if ($("#ygo_calc5_check_search_unique:checked").val() == "on")
    ids_sum2 = Array.from(new Set(ids_sum2));
  const content = ids_sum2
    .map(id => df.filter(row => row.get("id") === id).toDict()["name_Jap"][0]).slice().sort();
  const selectedList = $("#ygo_calc5_input_list").val();
  const selectedContent = $("#ygo_calc5_input_listContent").val();
  if (selectedList!="Set" || !selectedContent) content="valid SET should be selected."
  $("#ygo_calc5_result_card2").html("Search Results<br>" + content.join("<br>"));
}

function remake_calc3_result() {
  const selectedList = $("#ygo_calc3_input_list").val().toLowerCase();
  const candidates = operate_storage(`ygo_${selectedList}_candidate`, "obtain");
  $("#ygo_calc3_result_card1").html(candidates.join("<br>").replace(/:::::|::::|:::/g, "_")
  .replace(/\n/g, "<br>").replace(/,/g, " ").replace(/_._/, "_"));
  const results = operate_storage(`ygo_${selectedList}`, "obtain");
  $("#ygo_calc3_result_card2").html(results.join("<br>").replace(/_____|____|___/g, "<br>")
  .replace(/:::::|::::|:::/g, "_").replace(/\n/g, "<br>").replace(/,/g, " ").replace(/_._/, "_"));
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
  const options_new = before_ygo_hands.map(
    (d, index) => `${judges_hands[index]} : ${d.split(seps[1])[0]}`
  );
  //change 4=> 5
  $("#ygo_calc5_result_card2").html("Draw Cards<br>" + initial_hand.join("<br>"));
  $("#ygo_calc5_result_card1").html(options_new.join("<br>").replace(/:::::|::::|:::/g, "_").replace(/\n/g, "<br>").replace(/,/g, " ").replace(/_._/, "_"));
}


async function remake_calc5_result() {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();

  let values = operate_storage(`ygo_${selectedList}`, "obtain");
  const options = values.map(d => d.replace(/:::::|::::|:::/g, "_").replace(/,/g, " ").replace(/_._/, "_"));
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
    const tmp_lengths = ids_sums
      .map(d => d.filter(dd => initial_ids.includes(dd)))
      .map(d => {
        if (d == []) return 0;
        else return d.length;
      });
    const judge_tmps = tmp_lengths.map((tmp_length, index) => {
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
  const ids = JSON.parse(localStorage.ygo_searchSetId);
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
    const tmp_lengths = ids_sums_tmp
      .map(d => Array.from(new Set(d)))
      .map(d => d.filter(dd => initial_ids.includes(dd)))
      .map(d => {
        if (d == []) return 0;
        else return d.length;
      });
    const judge_tmps = tmp_lengths.map((tmp_length, index) => {
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
  if (!selectedSets) return [];
  let data_main = limited_ids;
  if (limited_ids[0] == "fromDeck")
    data_main = await obtain_main_deck().then(_ => _);
  const seps = seps_all["ygo_set"];
  const seps2 = seps_all["ygo_set_candidate"];
  const card_sentences = selectedSets.map(d => d.split(seps[1])[1].split(seps2[2]));
  const df_deck = await dfjs.DataFrame.fromCSV(ygo_db_url)
    .then(df => df.filter(row => data_main.indexOf(row.get("id")) != -1));
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
  const seps = seps_all["ygo_searchSet"];

  before_ygo_searchSet_tmp = operate_storage("ygo_searchSet", "obtain").map(d => d.split(seps[1])[1]);

  const seps2 = seps_all["ygo_searchSet_candidate"];
  const seps3 = seps_all["ygo_set"];

  let ids_tmp = { From: [], To: [] };
  for (key of Object.keys(ids_tmp)) {
    ids_tmp[key] = before_ygo_searchSet_tmp.map(d =>
      d.split(seps2[2]).filter(dd => dd.split(seps2[1])[0] == key)
        .map(dd => `tmp${seps3[1]}${dd.split(seps2[1])[1]}`));
  }
  let ids_tmp2 = { From: [], To: [] };
  for (key of Object.keys(ids_tmp2)) {
    for (card of ids_tmp[key]) {
      tmp_ids = await ygo_search(card).then(d => d[0]).then(d => [...d]);
      ids_tmp2[key].push(Array.from(new Set(tmp_ids)));
    }
  }
  return { searcher: ids_tmp2["From"], searched: ids_tmp2["To"] };
}

async function ygo_search_check_2(ids_sums_tmp, ids) {
  let ids_add = [];
  if (!ids_sums_tmp) return;
  return ids_sums_tmp.map((ids_sum) => {
    ids_add = [];
    for (index = 0; index < ids.searched.length; index++) {
      if (ids.searched[index].some(dd => ids_sum.indexOf(dd) != -1))
        ids_add = ids_add.concat(ids.searcher[index]);
    }
    return ids_sum.concat(ids_add);
  });
}

$(async function () {
  fetch("data/ProjectIgnis/deck/ydks.dat")
    .then(res => res.text())
    .then(data => data.split("\n"))
    .then(async (fileList) => {
      remake_option(fileList, "ygo_calc0_input_deck");
      remake_option(fileList, "ygo_calc0_input_anotherDeck");
      const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
      const default_keys = Object.keys(df.toDict());
      localStorage.default_keys = default_keys.join(",");
      const initialList="Set";
      $("#ygo_input_list").val(initialList);
      remake_option(lowerList[initialList.toLowerCase()].map(d => d[0].toUpperCase() + d.slice(1)).concat(default_keys), "ygo_calc3_input_item");

      if (!localStorage.deck_name) $("#ygo_calc0_input_deck").val(localStorage.deck_name);
      $("#ygo_calc3_input_item").val("name_Jap");

      remake_calc0_result();
      remake_calc3_result();
      remake_calc3_option(true, false);
      remake_calc5_result();
    });
});

$("#ygo_calc0_up").on("change", async function () {
  $("#ygo_calc0_result_card1").val("Uploading ...");
  files_tmp = await this.files;
  const seps = seps_all["ygo_uploaded_deck"];
  let uploaded_data = [];
  for (file_tmp of files_tmp) uploaded_data.push(`${file_tmp.name}${seps[1]}${await file_tmp.text()}`);

  const file_format = $("#ygo_calc0_input_fileFormat").val();
  if (/^deck/.test(file_format)) {
    if (file_format != "deck-id") {
      let df = await dfjs.DataFrame.fromCSV(ygo_db_url);
      const orig_format = file_format.replace("^deck-", "");
      uploaded_data = uploaded_data.map(data_tmp => {
        d_splited = data_tmp.split(seps[1]);
        try {
          d_splited[1].map(dd => {
            if (/^#/.test(dd)) return dd;
            else return df.filter(row => row.get(orig_format) == dd).toDict()["id"][0];
          });
          $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + `<br>${d_splited[0]}`)
        } catch {
          $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + `<br>error with ${d_splited[0]}`)
          d_splited[1] = [];
        }
        return d_splited.join(seps[1]);
      });
    }
    let before_ygo_uploaded_deck = [];
    if (localStorage.getItem("ygo_uploaded_deck"))
      before_ygo_uploaded_deck = localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
    before_ygo_uploaded_deck = before_ygo_uploaded_deck.concat(uploaded_data);

    localStorage["ygo_uploaded_deck"] = before_ygo_uploaded_deck.join(seps[2]);
    remake_calc0_result();
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
    $("#ygo_calc0_result_card1").html($("#ygo_calc0_result_card1").html() + dl_file);
    dl_data = await translate_deck(dl_file, file_format).then(d => d.join("\r\n"));
    if (file_format != "deck-id") dl_name = `${orig_format}-${dl_file}`;
    else dl_name = dl_file;
  }
  else if (/^cache/.test(file_format)) {
    dl_name = file_format + ".json";
    let tmp_dic = {};
    for (key of Object.keys(seps_all)) {
      tmp_dic[key] = localStorage.getItem(key);
    }
    dl_data = JSON.stringify(tmp_dic);
  }
  const blob = new Blob([dl_data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = dl_name;
  a.href = url;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

$("#ygo_calc0_input_deck").on("click", function () {
  localStorage.deck_name = $("#ygo_calc0_input_deck").val();
  remake_all();
});

$("#ygo_calc0_button_preview").on("click", async function () {
  const file_format = $("#ygo_calc0_input_fileFormat").val();
  const deck_name = $("#ygo_calc0_input_deck").val();
  const deck_data = await translate_deck(deck_name, file_format);
  $("#ygo_calc0_result_card1").html(deck_data.join("<br>"));
});


//ygo_3


$("#ygo_calc3_input_list").on("change", function () {

  $("#ygo_calc3_input_addition").val("");
  remake_calc3_option(true, true);

  remake_calc3_result();
});

$("#ygo_calc3_input_item").on("click", async function () {
  $("#ygo_calc3_input_keyword").val("");

  remake_calc3_option(true, false);
});

$("#ygo_calc3_input_condition").on("click", async function () {
  $("#ygo_calc3_input_keyword").val("");
  remake_calc3_option(false, false);
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

$("#ygo_calc3_button_sync").on("click", function () {
  remake_calc3_result();
  remake_calc3_option();
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
  console.log()
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
  const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
  const random_ids = random_number.map(d => data_main[d]);
  const initial_hand = random_number
    .slice(0, 5).map(d => data_main[d])
    .map(ind => df.filter(row => row.get("id") === ind).toDict()["name_Jap"][0]);
  localStorage.ygo_tryDraw = JSON.stringify({
    random_ids: random_ids.join(","),
    initial_hand: initial_hand.join(","),
  });
  remake_calc5_result_draw();
});

$("#ygo_calc5_button_calc").on("click", async function () {
  const data_main = await obtain_main_deck().then(_ => _);
  const deck_size = data_main.length;
  //cycle_number=Number($("#ygo_calc5_input_cycle").val());
  const cycle_number = 1000;
  const initial_idss = [...Array(cycle_number).keys()].map(_ => {
    const random_tmp = [...Array(deck_size).keys()].map(__ => Math.random());
    const random_number = random_tmp.slice().sort().map(d => random_tmp.indexOf(d));
    return random_number.map(d => data_main[d]).slice(0, 5);
  });

  const seps = seps_all["ygo_hand"];
  const hands = operate_storage("ygo_hand", "obtain");
  const hand_names = hands.map(d => d.split(seps[1])[0]);

  judgess = await calc_from_hands(hands, initial_idss)

  let counts = [];
  for (let index of [...Array(hands.length).keys()]) counts.push(judgess.map(d => d[index]).filter(d => d == "O").length);
  let output = counts.map((d, index) => `${hand_names[index]} : ${d} / ${cycle_number}`);

  const seps_g = seps_all["ygo_group"];
  const groups = operate_storage("ygo_group", "obtain");
  let group_name = "";
  let g_hands = [];
  let g_judge_count = "";
  for (group of groups) {
    group_name = group.split(seps_g[1])[0];
    g_hands = group.split(seps_g[1])[1].spilt(seps_g[2]);
    judgess_tmp = await calc_from_hands(g_hands, initial_idss);
    g_judge_count = judgess_tmp.filter(d => d.some(dd => dd == "O")).length;
    output.push(`${group_name} : ${g_judge} / ${cycle_number}`)
  }

  $("#ygo_calc5_result_card1").html("Probabilities<br>" + output.join("<br>"));
});

async function calc_from_hands(hands, initial_idss) {
  const seps = seps_all["ygo_hand"];
  const seps2 = seps_all["ygo_hand_candidate"];
  const ids = JSON.parse(localStorage.ygo_searchSetId);

  let count_tmp = 0;
  const selectedSetss = hands.map(d => d.split(seps[1]).split(seps2[2]).map(dd => dd.split(seps2[1])[1]));
  const min_maxss = hands.map(d => d.split(seps[1]).split(seps2[2]).map(dd => dd.split(seps2[1])[0]));
  let ids_sums_tmps = [];
  for (selectedSets of selectedSetss) ids_sums_tmps.push(await ygo_search(selectedSets));

  let judgess = [];
  for (initial_ids of initial_idss) {
    count_tmp = count_tmp + 1;
    judgess.push(await ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, true, ids));
  }
  return judgess;
}

$("#ygo_calc5_button_search").on("click", async function () {
  const selectedList = $("#ygo_calc5_input_list").val();
  const selectedContent = $("#ygo_calc5_input_listContent").val();

  let seps = seps_all["ygo_set"];
  let content = "";
  if (selectedList == "Set") content = `${selectedContent.split(seps[1])[1]}`;

  await ygo_search([`.${seps[1]}${content}`]);
  remake_calc5_search_result();
});


$("#ygo_calc5_button_rename").on("click", function () {
  const selectedList = $("#ygo_calc5_input_list").val().toLowerCase();
  const selectedContent = $("#ygo_calc5_input_listContent").val();
  const name = $("#ygo_calc5_input_name").val();

  operate_storage(`ygo_${selectedList}`, "rename", selectedContent, name);
  remake_calc5_result();
  remake_calc3_result();

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
