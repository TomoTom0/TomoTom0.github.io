
const discord_webhook = 'https://discordapp.com/api/webhooks/749901851008303154/dXSroIm4Wc1bGysbTrSO_PWh8iL7lNLXYsoS9OVmWmV99s7rHgfUtEVhjysJr7wregys';
const gs_webhook= "https://script.google.com/macros/s/AKfycbwL7Mj0MbCGZkhk-CJMWTBCUem_KZE2wA8lefP4WcszRF-GN-nJ/exec";


const file_url_default = "index.html";
const file_url_default2 = "data/JUS_data.dat";
// import DataFrame from "https://gmousse.github.io/dataframe-js/dist/dataframe.min.js";
// webhook
function Webhook2Discord(content = "?jus", webhook_url = discord_webhook) {
    let xmlhttp = new XMLHttpRequest();
    //自分のwebhook URLを取得して、以下に代入
    let myJSONStr = `{"content":"${content}"}`;
    xmlhttp.open('POST', webhook_url, false);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.send(myJSONStr);
}

function Webhook2GS(content = "?jus", webhook_url = gs_webhook) {
    const obj = {hello: "world"};
    const method = "POST";
    const body = JSON.stringify(obj);
    const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
    };
    console.log(webhook_url)
    fetch(webhook_url, {method, headers, body, mode: "no-cors", redirect:"follow"})
    .then((res)=> res.json())
    .then(console.log)
    .catch(console.error);
}

// js_test : dice roll
function dice(dice_num = 2, max_num = 6) {
    let results = [...Array(dice_num).keys()].map((d) => { return Math.floor(Math.random() * max_num + 1); });
    alert(`ダイスロール!!\n${results}`)
}

function dice2(dice_num = 2, max_num = 6) {
    let results = [...Array(dice_num).keys()].map((d) => { return Math.floor(Math.random() * max_num + 1); });
    return results;
}

$('#js_dice_button').on("click", function () {
    let dice_num = $("#input_n1 option:selected").val() - 0;
    let max_num = $("#input_n2 option:selected").val() - 0;
    $("#result").val(nums);
    let results = [...Array(dice_num).keys()].map(d => { return Math.floor(Math.random() * max_num + 1); });
    $("#result").val(`ダイスロール!!\n${results}`);
})

$('#js_dice_button_card').on("click", function () {
    let dice_num = $("#input_n1_card option:selected").val() - 0;
    let max_num = $("#input_n2_card option:selected").val() - 0;

    let results = [...Array(dice_num).keys()].map(d => { return Math.floor(Math.random() * max_num + 1); });
    $("#result_card1").val(` `);
    $("#result_card2").val(`${results}`);
})

$("#js_jus_button_card").on("click", function () {
    let play_num = $("#jus_input_play_card option:selected").val() - 0;
    let team_p = $("#jus_input_team_card").val() - 0;

    var file_url = file_url_default2;
    console.log(file_url);
    fetch(file_url)
        .then(res => {
            return res.text()
        })
        .then(data => {
            //console.log(data);
            return data.split("\n")
                .filter(d => { return !d.startsWith("#"); })
                .filter(d => { return d.split(",").length == 4; }) // 例外処理は今は適当
                .map(d => { return d.split(","); });
        })
        .then(jus_stages => {
            var sizes_all = {"small":"せまい", "medium":"ふつう", "large":"ひろい"};
            var sizes_selected = Object.keys(sizes_all)
            .filter(d => {
                return $(`#jus_check_${d}:checked`).val() == "on";
            })
            .map(d => {return sizes_all[d]});
            console.log(sizes_selected);

            var jus_stages_tmp = jus_stages.filter(d=> {return sizes_selected.indexOf(d[3]) != -1});
            console.log(jus_stages_tmp);

            var stage_out = jus_stages_tmp[Math.floor(Math.random() * jus_stages_tmp.length)];
            var rules_all = ["Point", "Death", "J-Symbol"];
            var rules_selected = rules_all.filter(d => {
                return $(`#jus_check_${d}:checked`).val() == "on";
            });
            console.log(rules_selected);

            var rule_out = rules_selected[Math.floor(Math.random() * rules_selected.length)];
            var team_out = "-";
            if (Math.random() < team_p) {
                team_out = Math.floor(Math.random() * (play_num - 2) + 2);
            }
            console.log(jus_stages, rules_all, rules_selected);
            //const content_pre="play team rule stage"
            const content1 = `${play_num} | 1&${team_out} | ${rule_out}`;
            const content2 = `${stage_out[0]}`;
            $("#jus_result_tmp").val("...");
            $("#jus_result_card1").val(content1);
            $("#jus_result_card2").val(content2);
        })
})

function jus(play_num = 4, team_p = 0.25, rule = "123", size = "123") {
    var file_url = file_url_default2;
    console.log(file_url);
    fetch(file_url)
        .then(res => {
            return res.text()
        })
        .then(data => {
            console.log(data);
            return data.split("\n").filter(d => { return !d.startsWith("#"); })
                .filter(d => { return d.split(",").length == 4; }) // 例外処理は今は適当
                .map(d => { return d.split(","); });
        })
        .then(jus_stages => {
            var stage_out = jus_stages[Math.floor(Math.random() * jus_stages.length)];
            var rules_all = ["Point", "Death", "J-Symbol"];
            var rules_selected = rules_all.filter((d, index) => { return rule.indexOf(index) != -1; });
            var rule_out = rules_selected[Math.floor(Math.random() * rules_selected.length)];
            var team_out = "-";
            if (Math.random() < team_p) {
                team_out = Math.floor(Math.random() * (play_num - 2) + 2);
            }
            console.log(jus_stages, rules_all, rules_selected);
            //const content_pre="play team rule stage"
            const content = `${play_num} | 1&${team_out} | ${rule_out} | ${stage_out[0]}`;
            alert(content);
        })
}

function get_file(file_url = file_url_default2) {
    console.log(file_url);
    fetch(file_url)
        .then(res => {
            console.log(res.text());
            return res.blob().then(blob => ({
                contentType: res.headers.get("Content-Type"),
                blob: blob
            }));
        })
        .then(data => {
            console.log(data.text());
            var file = new File([data.blob], file_url, { type: data.contentType });
        })
    return file;
}

function getText() {
    alert("coming...")
    var dataPath = "data/data.txt";
    $("#txtPlace").get(dataPath)
        .done(function (data) {
            alert(data);
        });
}



