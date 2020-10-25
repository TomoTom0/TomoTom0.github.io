

const seps_all={"ygo_uploaded_deck":[null,":::","___"],
    "ygo_set_candidate":["--", null, "\n"],
    "ygo_set":["---", ":::", "___"],
    "ygo_searchSet_candidate":["----", "::::", "____"],
    "ygo_searchSet":["-----", ":::::", "_____"],
    "ygo_judge_candidate":["----", "::::", "____"],
    "ygo_judge":["-----", ":::::", "_____"],
    "ygo_group_candidate":["------", "::::::", "______"],
    "ygo_group":["-------", ":::::::", "_______"]};

function remake_option(options, select_id, overWrite=true, values=[], form="select"){
    const select_id_re=select_id.replace(/^#/, "");
    const select = $(`#${select_id_re}`);
    if (overWrite) $(`${form}#${select_id_re} option`).remove();
    if (values==[] || values.length != options.length) values = options;
    for (let i=0;i<options.length; i++){
        const option = $('<option>')
        .text(options[i]).val(values[i]);
        select.append(option);
    }
}

async function obtain_main_deck(){
    const deck_name=$("#ygo_calc1_input_deck").val();
    const file_url = `data/ProjectIgnis/deck/${deck_name}`;
    return fetch(file_url)
    .then(res=>res.text())
    .then(data => {
        const data_tmp=data.split("\r\n");
        const main_index=data_tmp.indexOf( "#main");
        const extra_index=data_tmp.indexOf( "#extra");
        return data_tmp
        .filter((_,index) => index > main_index && index < extra_index)
        .filter(d => !d.startsWith("#") );
    })
}

function remake_all(){
    const input_ids={item : "ygo_calc1_input_item",
    condition : "ygo_calc1_input_condition",
    keyword_list :"ygo_calc1_input_keywordlist"};
    remake_itemConditionKey_options(input_ids);
    remake_calc0_result();
    remake_calc1_result();
    remake_calc2_result();
    remake_calc2_result_search();
    remake_calc2_search_option();
    remake_calc3_result();
    remake_calc3_option();
    remake_calc4_result();
    remake_calc4_result_group();
    remake_calc5_result();
    remake_itemConditionKey_options(input_ids, change_condition=false);

}

function output_localStorage(){
    let tmp_dic={};
    for(key of Object.keys(seps_all)) {
        tmp_dic[key]=localStorage.getItem(key);
    }
    const data_json=JSON.stringify(tmp_dic);

    const blob = new Blob([data_json], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "ygo.json";
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function operate_storage(storage_key="", operate="", selected_sentence="", new_name="", add_name=true, submit_key=""){
    const deck_name=$("#ygo_calc1_input_deck").val();
    if (!storage_key || Object.keys(seps_all).indexOf(storage_key)==-1) return;
    const seps=seps_all[storage_key];
    let before_storage=[];
    if(localStorage.getItem(storage_key)) before_storage=localStorage.getItem(storage_key).split(seps[2]);
    if(operate=="deleteAll"){
        localStorage[storage_key]=Array.from(new Set(before_storage
        .filter(d=> d.split(seps[0])[0] != deck_name))).join(seps[2]);
    }
    else if(operate=="delete"){
        localStorage[storage_key]=Array.from(new Set(before_storage
        .filter(d=> d.split(seps[0])[0] != deck_name || d.split(seps[0])[1] != selected_sentence))).join(seps[2]);
    }
    else if(operate=="add"){
        if (!selected_sentence) return;
        let content="";
        if (add_name && new_name) content=`${deck_name}${seps[0]}${new_name}${seps[1]}${selected_sentence}`;
        else content=`${deck_name}${seps[0]}${selected_sentence}`;
        if (!content) return;
        before_storage.push(content);
        localStorage[storage_key]=Array.from(new Set(before_storage)).join(seps[2]);
    }
    else if(operate=="obtain"){
        return before_storage
        .filter(d=>d.split(seps[0])[0] == deck_name)
        .map(d=>d.split(seps[0])[1]);
    }
    else if (operate=="submit"){
        if( Object.keys(seps_all).indexOf(submit_key)==-1) return;
        const content=before_storage
        .filter(d=>d.split(seps[0])[0] == deck_name)
        .map(d=>d.split(seps[0])[1]).join(seps[2]);

        operate_storage(submit_key, "add", content, new_name);
        operate_storage(storage_key, "deleteAll");
    }
    else if (operate=="rename"){
        operate_storage(storage_key, "delete", selected_sentence);
        operate_storage(storage_key, "add", selected_sentence, new_name);
    }
}


async function remake_itemConditionKey_options(input_ids, change_condition=true){
    const item_numbers=["id", "level", "PS", "atk", "def"];
    const item_limited_strings=["attribute", "id"];
    const selected_item=$(`#${input_ids.item}`).val();
    if (change_condition){
    const options_numbers=["==", "!=", ">", "<"];
    const options_limited_strings=["==", "!="];
    const options_unlimited_strings=["==", "!=", "include", "not include"];
    let options = [];
    if (item_numbers.indexOf(selected_item) != -1){
        options = options_numbers;
    } else if (item_limited_strings.indexOf(selected_item) != -1){
        options = options_limited_strings;
    } else options = options_unlimited_strings;
    remake_option(options, input_ids.condition, overWrite=true);
    }

    const data_main = await obtain_main_deck().then(_=>_);
    if (!data_main) return;
    let sorted_array_tmp = await dfjs.DataFrame.fromCSV(ygo_db_url)
    .then(df=>df.filter(row => data_main.indexOf(row.get("id")) != -1)
    .toDict()[selected_item].slice().sort());

    const selected_condition=$(`#${input_ids.condition}`).val();
    if (selected_item=="type" && ["include", "not include"].indexOf(selected_condition)!=-1){
        sorted_array_tmp.map(d=>[...d.split(" ")]);
    }
    let options_key = Array.from(new Set([...sorted_array_tmp])).slice().sort();
    remake_option(options_key, input_ids.keyword_list, overWrite=true, values=[], form="");
}

function remake_calc0_result(){
    const seps=seps_all["ygo_uploaded_deck"];
    let before_ygo_uploaded_deck=[];
    if (localStorage.getItem("ygo_uploaded_deck")) before_ygo_uploaded_deck=localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
    let options=before_ygo_uploaded_deck.map(d=>d.split(seps[1])[0]);
    remake_option(options, "ygo_calc0_input_dlFile");
    remake_option(options, "ygo_calc0_input_anotherDeck");

}

function remake_calc1_result(){
    const options=operate_storage("ygo_set_candidate", "obtain");

    remake_option(options, "ygo_calc1_input_addlist");
    $("#ygo_calc1_result_card1").html(options.join("<br>").replace(/,/g, " "));
}

function remake_calc2_result(){
    const deck_name=$("#ygo_calc1_input_deck").val();
    let values=[]
    if (localStorage.ygo_set) values=localStorage.ygo_set.split("___").filter(d=>d.split("---")[0]==deck_name)
    .map(d=>d.split("---")[1]);
    const options=values
    .map(d=> d.split(":::"))
    .map(d=>{
            d_cont=d[1].split("\n")
            .map(d_tmp1=>{
                d_tmp=d_tmp1.split(",");
                return [d_tmp[3], d_tmp[0], d_tmp[1], d_tmp[2]].join(" ");
            }).join("\n");
            return `${d[0]}:::${d_cont}`
    });
    remake_option(options, "ygo_calc2_input_setlist", overWrite=true, values=values);
    remake_calc3_option();
    //change calc2 => calc1
    $("#ygo_calc1_result_card2").html(options.join("<br>").replace(/:::|\n/g, "<br>"));
}
async function remake_calc2_result_search(){
    let options_candidate=operate_storage("ygo_searchSet_candidate", "obtain");
    $("#ygo_calc2_result_card2").html(options_candidate.join("<br>").replace(/::::/g,"<br>"));

    let options=operate_storage("ygo_searchSet", "obtain");
    remake_option(options, "ygo_calc2_input_searchlist");
    const ids=await ygo_search_check_1();
    localStorage.ygo_searchSetId=JSON.stringify(ids);
}

function remake_calc2_search_option(change_condition=true){
    const searchItem=$("#ygo_calc2_input_searchItem").val();
    if (searchItem=="Set") {
        if (change_condition) remake_option(["==", "!="], "ygo_calc2_input_searchCondition");
        let sorted_array=[];
        if(localStorage.ygo_set){
        sorted_array=operate_storage("ygo_set", "obtain");
        }
        let options_key = Array.from(new Set(sorted_array)).slice().sort();
        remake_option(options_key, "ygo_calc2_input_searchKeyword_list", true, [], "");
    }
    else if (searchItem){
        const input_ids={item : "ygo_calc2_input_searchItem",
        condition : "ygo_calc2_input_searchCondition",
        keyword_list :"ygo_calc2_input_searchKeyword_list"};
        remake_itemConditionKey_options(input_ids, change_condition);
    }
}

function remake_calc3_option(change_condition=true){
    const searchItem=$("#ygo_calc3_input_item").val();
    if (searchItem=="Set") {
        if (change_condition) remake_option(["==", "!="], "ygo_calc3_input_condition");
        let sorted_array=[];
        if(localStorage.ygo_set){
        sorted_array=operate_storage("ygo_set", "obtain");
        }
        let options_key = Array.from(new Set(sorted_array)).slice().sort();
        remake_option(options_key, "ygo_calc3_input_keyword_list", true, [], "");
    }
    else if (searchItem){
        const input_ids={item : "ygo_calc3_input_item",
        condition : "ygo_calc3_input_condition",
        keyword_list :"ygo_calc3_input_keyword_list"};
        remake_itemConditionKey_options(input_ids, change_condition);
    }
}

async function remake_calc3_search_result(){
    const df=await dfjs.DataFrame.fromCSV(ygo_db_url);
    let ids_sum=[];
    if (sessionStorage.ids_sums) ids_sum=sessionStorage.ids_sums.split("\n")[0].split(",");
    if ($("#ygo_calc3_check_search_include:checked").val()=="on"){
        //const ids= await ygo_search_check_1().then(_=>_);
        const ids=JSON.parse(localStorage.ygo_searchSetId);
        for(_ of Array(10)){
            ids_sum = await ygo_search_check_2([ids_sum], ids).then(d=>d[0]);
        }
    }
    const data_main=await obtain_main_deck().then(_=>_);
    let ids_sum2=data_main.filter(d=>ids_sum.indexOf(d)!=-1);
    if ($("#ygo_calc3_check_search_unique:checked").val()=="on") ids_sum2=Array.from(new Set(ids_sum2));
    const content=ids_sum2.map(id=>df.filter(row=>row.get("id")===id).toDict()["name_Jap"][0]).slice().sort();
    $("#ygo_calc3_result_card2").html(content.join("<br>"));
}

function remake_calc3_result(){
    const options=operate_storage("ygo_judge_candidate", "obtain");
    $("#ygo_calc3_result_card1").html(options.join("<br>").replace(/:::|\n/g, "<br>"));
}

async function remake_calc4_result(){
    let options=operate_storage("ygo_judge", "obtain");
    let initial_hand=[];
    let initial_ids=[];
    if (localStorage.ygo_tryDraw) {
        ygo_tryDraw=JSON.parse(localStorage.ygo_tryDraw)
        initial_hand=ygo_tryDraw.initial_hand.split(",");
        initial_ids=ygo_tryDraw.random_ids.split(",").slice(0, initial_hand.length);
    }
    const judges=await ygo_judge(options, initial_ids, include_search=true).then(_=>_);
    const seps=seps_all["ygo_judge"];
    const options_new = options.map((d, index) => `${judges[index]} : ${d.split(seps[1])[0]}`);
    remake_option(options=options, select_id="ygo_calc4_input_judgelist");
    $("#ygo_calc4_result_card2").html(initial_hand.join("<br>"));
    $("#ygo_calc4_result_card1").html(options_new.join("<br>").replace(/:::::|::::|:::|\n/g, "<br>").replace(/,/g, " "));
}

async function remake_calc4_result_group(){
    seps=seps_all["ygo_group_candidate"];
    const judge_names=operate_storage("ygo_group_candidate", "obtain")
    .map(d=>d.split(seps[1])[0]);
    $("#ygo_calc4_result_card3").html(judge_names.join("<br>"));
}

async function remake_calc5_result(){

    let options=operate_storage("ygo_group", "obtain");
    remake_option(options=options, select_id="ygo_calc5_input_grouplist");
}

async function ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, include_search=true, ids){
    let judges=[];
    if (include_search){
        for (ids_sums_tmp of ids_sums_tmps){
            for(_ of Array(10)) ids_sums_tmp = await ygo_search_check_2(ids_sums_tmp, ids).then(d=>d);
        }
    }
    for(i=0;i<ids_sums_tmps.length;i++){
        let min_maxs=min_maxss[i];
        const ids_sums_tmp=ids_sums_tmps[i];
        let ids_sums=ids_sums_tmp.map(d=>Array.from(new Set(d)));
        if (!ids_sums) ids_sums=[];
        const tmp_lengths=ids_sums
        .map(d=>d.filter(dd=> initial_ids.includes(dd)))
        .map(d=>{
            if (d==[]) return 0;
            else return d.length;});
        const judge_tmps=tmp_lengths.map((tmp_length, index)=>{
            const min_max=min_maxs[index].split("-");
            let judge=true;
            if (min_max[0] !="") if(Number(min_max[0]) > tmp_length) judge=false;
            if (min_max[1] !="") if(Number(min_max[1]) < tmp_length) judge=false;
            return judge;
            });
        judges.push(judge_tmps.every(d=>d));
    }
    return judges.map(d=>{
        if(d) return "O";
        else return "X";
    });
}


async function ygo_judge(options, initial_ids, include_search=false){
    //const judge_names=options.map(d =>d.split(":::::")[0]);
    if (!options) return [];
    seps1=seps_all["ygo_judge"];
    seps2=seps_all["ygo_judge_candidate"];
    const selectedSetss=options.map(d=>d.split(seps1[1])[1].split(seps2[2]).map(dd=>dd.split(seps2[1])[1]));
    const min_maxss=options.map(d=>d.split(seps1[1])[1].split(seps2[2]).map(dd=>dd.split(seps2[1])[0]));
    let judges=[];
    const ids=JSON.parse(localStorage.ygo_searchSetId);
    for(i=0;i<selectedSetss.length;i++){
        let selectedSets=selectedSetss[i];
        let min_maxs=min_maxss[i];
        let ids_sums_tmp=await ygo_search(selectedSets).then(_=> _);
        if (include_search){
            for(_ of Array(10)){
                ids_sums_tmp = await ygo_search_check_2(ids_sums_tmp, ids).then(d=>d);
            }
        }
        if (!ids_sums_tmp) continue;
        const tmp_lengths=ids_sums_tmp.map(d=>Array.from(new Set(d)))
        .map(d=>d.filter(dd=> initial_ids.includes(dd)))
        .map(d=>{
            if (d==[]) return 0;
            else return d.length;});
        const judge_tmps=tmp_lengths.map((tmp_length, index)=>{
            const min_max=min_maxs[index].split("-");
            let judge=true;
            if (min_max[0] !="") if(Number(min_max[0]) > tmp_length) judge=false;
            if (min_max[1] !="") if(Number(min_max[1]) < tmp_length) judge=false;
            return judge;
            });
        judges.push(judge_tmps.every(d=>d));
    }
    return judges.map(d=>{
        if(d) return "O";
         else return "X";
    });
}

async function ygo_search(selectedSets, limited_ids=["fromDeck"]){
    if (!selectedSets) return [];
    let data_main=limited_ids;
    if (limited_ids[0]=="fromDeck") data_main=await obtain_main_deck().then(_=>_);
    const seps=seps_all["ygo_set"];
    const seps2=seps_all["ygo_set_candidate"];
    const card_sentences=selectedSets.map(d=>d.split(seps[1])[1].split(seps2[2]));
    const df_deck = await dfjs.DataFrame.fromCSV(ygo_db_url)
    .then(df=>df.filter(row => data_main.indexOf(row.get("id"))!=-1));
    const ids_sums=card_sentences
    .map(card_sentence => {
        let ids_sum=data_main;
        card_sentence
        .forEach(d=> {
            d_list=d.split(",");
            relation_tmp=d_list[1];
            andOr_tmp=d_list[3];
            if (relation_tmp==">") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && Number(row.get(d_list[0])) > Number(d_list[2])).toDict()["id"];
            if (relation_tmp=="<") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && Number(row.get(d_list[0])) < Number(d_list[2])).toDict()["id"];

            if (relation_tmp=="==") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && row.get(d_list[0])===d_list[2]).toDict()["id"];
            if (relation_tmp=="!=") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && row.get(d_list[0])!==d_list[2]).toDict()["id"];
            if (relation_tmp=="include") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && row.get(d_list[0]).indexOf(d_list[2])!=-1).toDict()["id"];
            if (relation_tmp=="not include") ids_tmp=df_deck.filter(row => row.get(d_list[0])!="NaN" && row.get(d_list[0]).indexOf(d_list[2])==-1).toDict()["id"];
            if (!ids_tmp) ids_tmp=[];
            if (andOr_tmp=="And") ids_sum=ids_sum.filter(ind=> ids_tmp.indexOf(ind)!=-1);
            if (andOr_tmp=="Or") ids_sum=data_main.filter(ind=> ids_tmp.indexOf(ind)!=-1 || ids_sum.indexOf(ind)!=-1);
        });
        if (!ids_sum || ids_sum==[""]) ids_sum=["noMatch"];
        return ids_sum;
    });

    sessionStorage.ids_sums=ids_sums.map(d=>d.join(",")).join("\n");
    return ids_sums;
}

async function ygo_search_check_1(){
    const seps=seps_all["ygo_searchSet"];

    before_ygo_searchSet_tmp=operate_storage("ygo_searchSet", "obtain")
    .map(d=>d.split(seps[1])[1]);

    const seps2=seps_all["ygo_searchSet_candidate"];
    const seps3=seps_all["ygo_set"];


    let ids_tmp={"From":[], "To":[]};
    for (key of Object.keys(ids_tmp)){
        ids_tmp[key]=before_ygo_searchSet_tmp
        .map(d=>d.split(seps2[2])
        .filter(dd=>dd.split(seps2[1])[0]==key)
        .map(dd=>`tmp${seps3[1]}${dd.split(seps2[1])[1]}`));
    }
    let ids_tmp2={"From":[], "To":[]};
    for (key of Object.keys(ids_tmp2)){
        for (card of ids_tmp[key]){
            tmp_ids=await ygo_search(card).then(d=>d[0]).then(d=>[...d]);
            ids_tmp2[key].push(Array.from(new Set(tmp_ids)));
        }
    }
    return {searcher:ids_tmp2["From"], searched:ids_tmp2["To"]};
}

async function ygo_search_check_2(ids_sums_tmp, ids){
    let ids_add=[];
    if (!ids_sums_tmp) return;
    return ids_sums_tmp.map(ids_sum=>{
        ids_add=[];
        for(index=0; index<ids.searched.length; index++){
            if (ids.searched[index].some(dd=>ids_sum.indexOf(dd)!=-1)) ids_add=ids_add.concat(ids.searcher[index]);
        }
        return ids_sum.concat(ids_add);
    })
}

$("#js_ygo_button_card").on("click", async()=> {
    const data_main=await obtain_main_deck().then(_=>_);

    const deck_size = data_main.length;
    const random_tmp = [...Array(deck_size).keys()].map((d) =>  Math.random()  ) ;
    const random_number = random_tmp.slice().sort().map((d) => random_tmp.indexOf(d));
    const df=await dfjs.DataFrame.fromCSV(ygo_db_url);
    const initial_hand = random_number.slice(0,5).map((d)=>data_main[d])
        .map((ind) => df.filter(row => row.get("id") === ind ).toDict()["name_Jap"][0]);
    $("#ygo_result_card1").html(initial_hand.join("<br>"));

    sessionStorage.random_number=random_number.join(",");
})

$("#js_ygo_button_card_more").on("click", async function () {
    const data_main=await obtain_main_deck().then(_=>_);
    const random_number=localStorage.random_number.split(",");
    const index_now =$("#ygo_result_card1").html(content1).split("<br>").length;
    const additional_hand = random_number.slice(index_now,index_now+1).map(d=>data_main[d])
        .map((ind) => df.filter(row => row.get("id") === ind ).toDict()["name_Jap"][0]).slice(0,5);
    $("#ygo_result_card2").html($("#ygo_result_card2").html() + "<br>"+additional_hand);
})

$(async function(){
remake_option(["magician6.43.ydk", "Zoodiac.ydk"], "ygo_calc1_input_deck");
const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
const options=Object.keys(df.toDict());
remake_option(options, "ygo_calc1_input_item");
remake_option(["Set"].concat(options), "ygo_calc2_input_searchItem");
remake_option(["Set"].concat(options), "ygo_calc3_input_item");

if (!localStorage.deck_name) $("#ygo_calc1_input_deck").val(localStorage.deck_name);
$("#ygo_calc1_input_item").val("name_Jap");
$("#ygo_calc2_input_searchItem").val("name_Jap");
$("#ygo_calc3_input_item").val("name_Jap");

remake_all();
})

$("#ygo_calc0_up").on("change", async function(){
    $("#ygo_calc0_result_card1").val("Uploaded ...");
    files_tmp=await this.files;
    const seps=seps_all["ygo_uploaded_deck"];
    let uploaded_data=[];
    for(file_tmp of files_tmp){
        uploaded_data.push(`${file_tmp.name}${seps[1]}${await file_tmp.text()}`);
    }
    console.log(uploaded_data);
    const file_format=$("#ygo_calc0_input_fileFormat").val();
    if (/^deck/.test(file_format)){
        if (file_format!="deck-id"){
            let df=await dfjs.DataFrame.fromCSV(ygo_db_url);
            const orig_format=file_format.replace("^deck-", "");
            uploaded_data=uploaded_data.map(data_tmp=>{
                d_splited=data_tmp.split(seps[1]);
                d_splited[1].map(dd=>{
                    if (/^#/.test(dd)) return dd;
                    else return  df.filter(row=>row.get(orig_format)==dd).toDict()["id"][0];
                })
                return d_splited.join(seps[1]);
            })
        }
        let before_ygo_uploaded_deck=[];
        if (localStorage.getItem("ygo_uploaded_deck")) before_ygo_uploaded_deck=localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
        before_ygo_uploaded_deck=before_ygo_uploaded_deck.concat(uploaded_data);

        $("#ygo_calc0_result_card1").val(`Uploaded ...${Array.from(files_tmp).map(d=>d.name).join("\n")}`);
        localStorage["ygo_uploaded_deck"]=before_ygo_uploaded_deck.join(seps[2]);
        remake_calc0_result();
    }
    else if (/^cache/.test(file_format)){
        //remake cache
    }
})

$("#ygo_calc0_down").on("click", async function(){
    const file_format=$("#ygo_calc0_input_fileFormat").val();
    const dl_file=$("#ygo_calc0_input_dlFile").val();
    let dl_name="";
    let dl_data=[];
    $("#ygo_calc0_result_card1").val("Downloading ...");
    if (/^deck-/.test(file_format)){
        $("#ygo_calc0_result_card1").val("Downloading ..." + dl_file);
        const seps=seps_all["ygo_uploaded_deck"];
        let before_ygo_uploaded_deck=[];
        if (localStorage.getItem("ygo_uploaded_deck")) before_ygo_uploaded_deck=localStorage.getItem("ygo_uploaded_deck").split(seps[2]);
        dl_data=before_ygo_uploaded_deck.filter(d=>d.split(seps[1])[0]==dl_file).map(d=>d.split(seps[1])[1])[0].split("\r\n");
        if (file_format!="deck-id"){
            let df=await dfjs.DataFrame.fromCSV(ygo_db_url);
            const orig_format=file_format.replace(/^deck-/, "");
            dl_name=`${orig_format}-${dl_file}`;
            dl_data=dl_data.map(id=>{
                if (/^#|^\s*$|^!/.test(id)) return id;
                else return  df.filter(row=>row.get("id")==id).toDict()[orig_format][0];
            });
        }
        else dl_name=dl_file;
    }
    else if (/^cache/.test(file_format)){
        dl_name=file_format;
        dl_data=["Not Yet"];
    }
    const blob = new Blob([dl_data.join("\r\n")], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = dl_name;
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
})

$("#ygo_calc1_input_item").on('click',function(){
    $("#ygo_calc1_input_keyword").val("");
    const input_ids={item : "ygo_calc1_input_item",
    condition : "ygo_calc1_input_condition",
    keyword_list :"ygo_calc1_input_keyword_list"};
    remake_itemConditionKey_options(input_ids);
})

$("#ygo_calc1_input_condition").on('click',function(){
    $("#ygo_calc1_input_keyword").val("");
    const input_ids={item : "ygo_calc1_input_item",
    condition : "ygo_calc1_input_condition",
    keyword_list :"ygo_calc1_input_keyword_list"};
    remake_itemConditionKey_options(input_ids, change_condition=false);
})


$("#ygo_calc1_input_deck").on('click',function(){
    localStorage.deck_name=$("#ygo_calc1_input_deck").val();
    remake_all();
})

$("#ygo_calc1_button_add").on('click',function(){
    const input_item=$("#ygo_calc1_input_item").val();
    const input_condition=$("#ygo_calc1_input_condition").val();
    const input_keyword=$("#ygo_calc1_input_keyword").val();
    const input_andOr=$("#ygo_calc1_input_andOr").val();

    const input_vals=[input_item, input_condition, input_keyword, input_andOr];
    if (!input_vals.every(d=> d!="")) return;
    operate_storage("ygo_set_candidate", "add", input_vals.join(","), null, false);
    remake_calc1_result();
    $("#ygo_calc1_input_keyword").val("");
})

$("#ygo_calc1_button_reset").on('click',function(){
    operate_storage("ygo_set_candidate", "deleteAll");

    $("#ygo_calc1_input_keyword").val("");
    remake_calc1_result();
})

$("#ygo_calc1_button_erase").on('click',function(){
    $("#ygo_calc1_input_keyword").val("");
})

$("#ygo_calc1_button_delete").on('click',function(){
    const selected_addlist=$("#ygo_calc1_input_addlist").val();
    operate_storage("ygo_set_candidate", "deleteAll", selected_addlist);

    remake_calc1_result();
})


$("#ygo_calc1_button_submit").on('click',function(){
    let cardName=$("#ygo_calc1_input_name").val();

    if (!cardName) {
        cardName=`C-${operate_storage("ygo_set", "obtain").length + 1}`;
    }
    operate_storage("ygo_set_candidate", "submit", null, cardName, false, "ygo_set");

    $("#ygo_calc1_input_keyword").val("");
    $("#ygo_calc1_input_name").val("");

    remake_calc1_result();
    remake_calc2_result();

})

$("#ygo_calc2_button_rename").on('click',function(){
    const selectedSet=$("#ygo_calc2_input_setlist").val();
    const new_name=$("#ygo_calc2_input_newName").val();

    operate_storage("ygo_set", "rename", selectedSet, new_name);

    $("#ygo_calc2_input_newName").val("");
    remake_calc2_result();
})


$("#ygo_calc2_button_edit").on('click',function(){
    const selectedSet=$("#ygo_calc2_input_setlist").val();

    operate_storage("ygo_set", "delete", selectedSet);

    seps=seps_all["ygo_set_candidate"];
    operate_storage("ygo_set_candidate", "add", selectedSet.split(seps[1])[1] , null,false);

    remake_calc2_result();
    remake_calc1_result();
    $("#ygo_calc1_input_name").val(selectedSet.split(seps[1])[0]);
})

$("#ygo_calc2_button_delete").on('click',function(){
    const selectedSet=$("#ygo_calc2_input_setlist").val();
    operate_storage("ygo_set", "delete", selectedSet);

    remake_calc2_result();
})

$("#ygo_calc2_button_deleteAll").on('click',function(){
    operate_storage("ygo_set", "deleteAll");

    remake_calc2_result();
})



$("#ygo_calc2_input_searchItem").on('click',async function(){
    $("#ygo_calc2_input_searchKeyword").val("");
    remake_calc2_search_option();
})

$("#ygo_calc2_input_searchCondition").on('click',async function(){
    $("#ygo_calc2_input_searchKeyword").val("");
    remake_calc2_search_option(change_condition=false);
})

$("#ygo_calc2_button_searchAdd").on('click',function(){
    const search=$("#ygo_calc2_input_search").val();
    const searchItem=$("#ygo_calc2_input_searchItem").val();
    const searchCondition=$("#ygo_calc2_input_searchCondition").val();
    const searchKeyword=$("#ygo_calc2_input_searchKeyword").val();

    let seps=seps_all["ygo_set"];
    if (searchItem=="Set") content=`${searchKeyword.split(seps[1])[1]}`;
    else content=`${searchItem},${searchCondition},${searchKeyword},And`;
    operate_storage("ygo_searchSet_candidate", "add", content, search);

    $("#ygo_calc2_input_searchKeyword").val("");

    remake_calc2_result_search();
})

$("#ygo_calc2_button_searchSubmit").on('click',function(){
    let searchName=$("#ygo_calc2_input_searchName").val();
    if (!searchName) searchName=`Search-${operate_storage("ygo_searchSet", "obtain").length+1}`;
    operate_storage("ygo_searchSet_candidate", "submit", null, searchName, false ,"ygo_searchSet");

    $("#ygo_calc2_input_searchName").val("");
    remake_calc2_result_search();
})

$("#ygo_calc2_button_searchDelete").on('click',function(){
    const selectedSearch=$("#ygo_calc2_input_searchlist").val();
    operate_storage("ygo_searchSet", "delete", selectedSearch);

    remake_calc2_result_search();
})

$("#ygo_calc2_button_searchDeleteCompletely").on('click',function(){

    //localStorage.clear();

    remake_calc2_result_search();
})

$("#ygo_calc2_button_searchRename").on('click',function(){
    const selectedSearch=$("#ygo_calc2_input_searchlist").val();
    const searchName=$("#ygo_calc2_input_searchName").val();

    operate_storage("ygo_searchSet", "rename", selectedSearch, searchName);

    remake_calc2_result_search();
})

$("#ygo_calc2_button_searchReset").on('click',function(){
    operate_storage("ygo_searchSet_candidate", "deleteAll");

    remake_calc2_result_search();
})

//ygo_3

$("#ygo_calc3_button_search").on('click',async function(){
    const selectedItem=$("#ygo_calc3_input_item").val();
    const selectedCondition=$("#ygo_calc3_input_condition").val();
    const selectedKeyword=$("#ygo_calc3_input_keyword").val();

    let seps=seps_all["ygo_set"];
    if (searchItem=="Set") content=`${selectedKeyword.split(seps[1])[1]}`;
    else content=`${selectedItem},${selectedCondition},${selectedKeyword},And`;

    await ygo_search([`tmp${seps[1]}${content}`]);
    remake_calc3_search_result();
})

$("#ygo_calc3_input_item").on('click',async function(){
    $("#ygo_calc3_input_keyword").val("");
    remake_calc3_option();
})

$("#ygo_calc3_input_condition").on('click',async function(){
    $("#ygo_calc3_input_keyword").val("");
    remake_calc3_option(change_condition=false);
})

$("#ygo_calc3_button_add").on('click',function(){
    let min_number=$("#ygo_calc3_input_minNumber").val();
    const max_number=$("#ygo_calc3_input_maxNumber").val();

    if(!min_number && !max_number) min_number=1;
    const selectedItem=$("#ygo_calc3_input_item").val();
    const selectedCondition=$("#ygo_calc3_input_condition").val();
    const selectedKeyword=$("#ygo_calc3_input_keyword").val();

    let seps=seps_all["ygo_set"];
    if (selectedItem=="Set") content=`.${seps[1]}${selectedKeyword.split(seps[1])[1]}`;
    else content=`.${seps[1]}${selectedItem},${selectedCondition},${selectedKeyword},And`;

    operate_storage("ygo_judge_candidate", "add", content, `${min_number}-${max_number}`);

    remake_calc3_result();
    $("#ygo_calc3_input_minNumber").val("");
    $("#ygo_calc3_input_maxNumber").val("");
    $("#ygo_calc3_input_keyword").val("")
})

$("#ygo_calc3_button_reset").on('click',function(){
    operate_storage("ygo_judge_candidate", "deleteAll");

    remake_calc3_result();
    $("#ygo_calc3_input_minNumber").val("");
    $("#ygo_calc3_input_maxNumber").val("");
    $("#ygo_calc3_input_keyword").val("")
})

$("#ygo_calc3_button_submit").on('click',function(){
    let judge_name=$("#ygo_calc3_input_judgeName").val();

    if (!judge_name) {
        judge_name=`H-${operate_storage("ygo_judge", "obtain").length+1}`;
    }
    operate_storage("ygo_judge_candidate", "submit", null ,judge_name, false, "ygo_judge");
    //operate_storage("ygo_judge_candidate", "submit", "" ,judge_name, false, "ygo_group");

    $("#ygo_calc3_input_judgeName").val("");
    $("#ygo_calc3_input_keyword").val("")

    remake_calc3_result();
    remake_calc4_result();
    remake_calc5_result();
})

$("#ygo_calc4_button_rename").on('click',function(){
    const selectedJudge=$("#ygo_calc4_input_judgelist").val();
    const new_name=$("#ygo_calc4_input_judgeName").val();
    operate_storage("ygo_group_candidate", "rename", selectedJudge ,new_name);

    $("#ygo_calc4_input_judgelist").val("");
    $("#ygo_calc4_input_judgeName").val("")
    remake_calc4_result();
})

$("#ygo_calc4_button_add").on('click',function(){
    const selectedJudge=$("#ygo_calc4_input_judgelist").val();
    operate_storage("ygo_group_candidate", "add", selectedJudge, null, false);

    remake_calc4_result_group();
    $("#ygo_calc4_input_judgelist").val("")

})

$("#ygo_calc4_button_reset").on('click',function(){

    operate_storage("ygo_group_candidate", "deleteAll");
    remake_calc4_result_group();
    $("#ygo_calc4_input_judgeName").val("")
})

$("#ygo_calc4_button_submit").on('click',function(){
    let group_name=$("#ygo_calc4_input_groupName").val();

    if (!group_name) {
        group_name=`G-${operate_storage("ygo_group", "obtain").length+1}`;
    }
    operate_storage("ygo_group_candidate", "submit", null, group_name, false, "ygo_group");

    $("#ygo_calc4_input_groupName").val("");
    remake_calc5_result();
    remake_calc4_result();
    remake_calc4_result_group();

})

$("#ygo_calc4_button_delete").on('click',function(){
    const selectedJudge=$("#ygo_calc4_input_judgelist").val();
    operate_storage("ygo_judge", "delete", selectedJudge);

    remake_calc4_result();
})

$("#ygo_calc4_button_deleteAll").on('click',function(){
    operate_storage("ygo_judge", "deleteAll");
    remake_calc4_result();
})

$("#ygo_calc4_button_draw").on('click',async ()=>{

    const data_main=await obtain_main_deck().then(_=>_);

    const deck_size = data_main.length;
    const random_tmp = [...Array(deck_size).keys()].map(_ => Math.random()) ;
    const random_number = random_tmp.slice().sort().map(d => random_tmp.indexOf(d));
    const df = await dfjs.DataFrame.fromCSV(ygo_db_url);
    const random_ids = random_number.map((d)=>data_main[d]);
    const initial_hand = random_number.slice(0,5).map((d)=>data_main[d])
        .map((ind) => df.filter(row => row.get("id") === ind ).toDict()["name_Jap"][0])
    localStorage.ygo_tryDraw=JSON.stringify({random_ids:random_ids.join(","), initial_hand:initial_hand.join(",")});
    remake_calc4_result();
})

$("#ygo_calc5_button_calc").on('click',async function(){
    console.log("calc");
    const deck_name=$("#ygo_calc1_input_deck").val();

    const data_main=await obtain_main_deck().then(_=>_);
    const deck_size = data_main.length;
    //cycle_number=Number($("#ygo_calc5_input_cycle").val());
    const cycle_number=1000;
    const initial_idss=[...Array(cycle_number).keys()].map(_=>{
    const random_tmp = [...Array(deck_size).keys()].map(__ => Math.random() ) ;
    const random_number = random_tmp.slice().sort().map(d => random_tmp.indexOf(d));
    return random_number.map((d)=>data_main[d]).slice(0,5);
    });
    let options=[];
    let judge_names=[];
    if (localStorage.ygo_judge) {
        options=localStorage.ygo_judge.split("_____").filter(d=>d.split("-----")[0]==deck_name)
        .map(d=>d.split("-----")[1]);
        judge_names=localStorage.ygo_judge.split("_____").filter(d=>d.split("-----")[0]==deck_name)
        .map(d=>d.split("-----")[1].split(":::::")[0]);
    }
    let count_tmp=0;
    const selectedSetss=options.map(d=>d.split(":::::")[1].split("____").map(dd=>dd.split("::::")[1]));
    const min_maxss=options.map(d=>d.split(":::::")[1].split("____").map(dd=>dd.split("::::")[0]));
    let ids_sums_tmps=[];
    for (selectedSets of selectedSetss){
        ids_sums_tmps.push(await ygo_search(selectedSets));
    };

    let judgess=[];
    $("#ygo_calc5_result_card3").val(`Progress :`);
    //const ids=await ygo_search_check_1();
    const ids=JSON.parse(localStorage.ygo_searchSetId);
    for (initial_ids of initial_idss){
        count_tmp=count_tmp+1;
        if (count_tmp%100==0) $("#ygo_calc5_result_card3").val(`Progress : ${count_tmp} / ${cycle_number}`);
        judgess.push(await ygo_judge_speed(ids_sums_tmps, min_maxss, initial_ids, include_search=true, ids));
    };
    let counts=[];
    for (let index of [...Array(options.length).keys()]){
        counts.push(judgess.map(d=>d[index]).filter(d=>d=="O").length);
    }

    const probs=counts.map((d,index)=>`${judge_names[index]} : ${d} / ${cycle_number}`);
    $("#ygo_calc5_result_card1").html(probs.join("<br>"));
})

$("#ygo_calc5_button_delete").on('click',function(){
    const selectedGroup=$("#ygo_calc5_input_grouplist").val();
    operate_storage("ygo_group", "delete", selectedGroup);

    remake_calc5_result();
})

$("#ygo_calc5_button_deleteAll").on('click',function(){
    operate_storage("ygo_group", "deleteAll");
    remake_calc5_result();
})

$("#ygo_calc5_button_output").on('click',function(){
    output_localStorage();
})
