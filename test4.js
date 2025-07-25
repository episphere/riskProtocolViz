import { newScenarios, testMap, counts,isTest } from './scenarios.js'


function getTotalCount(counts) {
    return Object.values(counts).reduce((acc, v) => {
        if (v < 0) throw new Error(`Sample with ${v}<0 counts`);
        if (!Number.isFinite(v)) throw new Error(`Sample with Bad count: ${v}`);
        return acc + v
    })
}

export class Sample {
    constructor(counts, total) {
        this.counts = counts;
        this.total = total
    }

    /**
     * Creates a new Sample.  If any of the values are negative, it throws an exception.
     * Note that all of the categories are mutally exclusive. (e.g You cannot be CIN2+ and CIN<2.)
     * 
     * @param {Object} counts - a pojo that contains all the catagories(keys) and counts(value)
     * @return {Sample} a new sample Object 
     */
    static fromObject(counts) {
        let total = getTotalCount(counts)
        return new Sample(counts, total)
    }

    static fromLabelTotal(total, knownCounts, otherLabel) {
        let knownTotal = getTotalCount(knownCounts);
        let otherCount = total - knownTotal;
        if (otherCount < 0) throw new Error(`Cannot create a sample with counts less than 0:\n total:${total} total of known counts:${knownTotal}\n${otherLabel}: ${otherCount}`);

        knownCounts[otherLabel] = otherCount;
        return new Sample(knownCounts, total)
    }

    get labels() {
        return Object.keys(this.counts)
    }

    add(otherSample) {
        if (!(otherSample instanceof Sample)) return this;

        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = this.counts[key] + otherSample.counts[key];
            return acc;
        }, {})
        return Sample.fromObject(cnts);
    }

    subtract(otherSample) {
        if (!(otherSample instanceof Sample)) {
            console.error("This: ", this);
            console.error("Trying to subtract :", otherSample)
            throw new Error(`Error subtracting from a sample`)
        }

        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = this.counts[key] - otherSample.counts[key];
            return acc;
        }, {})
        return Sample.fromObject(cnts);
    }

    scale(factor){
        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = factor * this.counts[key];
            return acc;
        }, {})
        return Sample.fromObject(cnts);
    }

    static isSample(obj){
        return obj instanceof Sample
    }
}

export class Test{
    constructor(config){
        this.config=config;
    }

    /**
     * 
     * @param {Object} sample Object with keys for each sample i.e. CIN2: SAMPLE 
     * @param {number} year 
     * @returns {Object} runs each sample and returns an Object result (a sample for each test outcome) 
     *                   for each key
     */
    runMultipleSamples(samples,year){
        let probs = this.config.probabilities(year);
        function _has_all_keys(key){
            let prob_keys=Object.keys(probs)
            let sample_keys=Object.keys(samples[key].counts )
            return sample_keys.every((k) => prob_keys.includes(k))
        }


        let full_samples=Object.keys(samples).filter( (key) => _has_all_keys(key))
        if (full_samples.length==0){
            throw new Error('NO SAMPLES are completely described by the test')
        }
        let sample_from_total = Object.keys(samples).filter( (key) => !full_samples.includes(key))

        // Run the case where we don't need the totals...
        console.log("Run: ",full_samples," then Run using totals: ",sample_from_total)
        let results = full_samples.reduce((acc,key) => {
            console.log(`.... running ${key} sample for year ${year}`)
            acc[key] = this.run(samples[key],year)
            return acc
        },{})

        // Run the cases where we need the total (for each output)
        // there may be more the 1 set of outcomes already run, so 
        // get the totals from the first set...
        let total = results[full_samples[0]];
        results = sample_from_total.reduce( (acc,key)=>{
            console.log(`.... still need to run ${key}.`)
            acc[key] = this.run_given_total(samples[key],total,year)
            return acc
        },results)

        console.log("results: ",results)
        console.log("bazinga!!")
        return results
    }

    /**
     * Returns the test results for the sample as an Object where
     * the keys are the outcomes, and the values are samples for the outcome
     * 
     * @param {Sample} sample - the sample of people taking the test.
     * @param {number} year - the year - needs for time-dependent parameters
     * @returns {Object} The test results - a Sample for all outcomes
     */
    run(sample,year){
        let probs = this.config.probabilities(year);

        // for each outcome create a sample
        return this.config.outcomes.reduce( (acc,outcome)=> {
            // for each sample label...
            let cntObj=sample.labels.reduce( (acc1,label) => {
                acc1[label]=sample.counts[label]*probs[label][outcome]
                return acc1
            },{})

            acc[outcome] = Sample.fromObject(cntObj);
            return acc
        },{})
    }

    /**
     * I have a case where I have CIN<2,CIN2+,CIN3+.  My Samples
     * can handle the case of CIN<2 and CIN2+ because they are mutually exclusive, 
     * CIN3+ is a problem because it is part of CIN2+.  
     * 
     * We need to handle this edge case:
     *  Total = CIN2<2 + CIN2+,
     *  run the test for CIN3+ and the resulting sample is CIN3+,(Total-CIN3+), Total
     * 
     * However, I don't know the labels that is missing.  It is the label missing from
     * the test probabilities.
     * 
     * @param {Sample} sample - the sample of people taking the test.
     * @param {Object} complete - a test results where I take the totals for each outcome from.  
     * @param {number} year - the year - needs for time-dependent parameters
     * @returns {Object} The test results - a Sample for all outcomes
     */
    run_given_total(sample,complete,year){
        let probs = this.config.probabilities(year);
        let prob_keys = Object.keys(probs)

        // for each outcome create a sample - sometimes i dont care about part of the
        // sample (e.g. CIN_LT_3), so the test does not have the probability for it.
        // however I can still calculate this as total - CIN3
        let sample_keys = Object.keys(sample.counts)
        let labels_to_run = sample_keys.filter((key)=>prob_keys.includes(key))

        // for each outcome...
        return this.config.outcomes.reduce( (acc,outcome)=> {
            let create_sample = {use_total:false};

            // for each sample label...
            let cntObj=sample.labels.reduce( (acc1,label) => {
                // If you have labels that you are not interested in...
                // skip it...
                if (labels_to_run.includes(label)){
                    //console.log(`label: ${label}: ${sample.counts[label]} outcome: ${outcome} p:${probs[label][outcome]}`)
                   acc1[label]=sample.counts[label]*probs[label][outcome]
                } else{
                    // I can calc. the sample by using the total, but
                    // this can handle at most 1 missing outcome prob.
                    if (create_sample.use_total) {
                        throw new Error(`Year ${year} test: ${testName} is missing probability for more than 1 label`)   
                    }
                    create_sample.use_total=true;
                    create_sample.missing_label = label;
                }
                return acc1
            },{})

            acc[outcome] = (create_sample.use_total)?
                              Sample.fromLabelTotal(complete[outcome].total,cntObj,create_sample.missing_label):
                              Sample.fromObject(cntObj);
            return acc
        },{})
    }

    get name(){
        return this.config.testName;
    }

    get outcomes(){
        return this.config.outcomes
    }

    static fromName(testName,testMap){
        let config = testMap.get(testName);
        return new Test(config)
    }
}


const max_iter = 10;
function run_scenario_msamp(scenario, testMap, sample, year, iter = 0){
    // avoid infinite recursion...
    if (iter > max_iter) {
        throw new Error(`iter ${iter} >10.  Possible scenario problem`)
    }
    let sample_keys = Object.keys(sample)

    let result={};
    if (isTest(scenario)){
        let test = Test.fromName(scenario.test,testMap)
        console.log(scenario.test)
        console.table(test.config.probabilities(year))
        let test_result = test.runMultipleSamples(sample,year);
        // convert test_result from {sample_1:{out1:,out2:...}} to 
        // {outcome1:{sample1:,sample2:}}
        Object.entries(test_result).reduce( (acc,[sample_label,outcomes]) => {
            Object.entries
        },{})

        result = {
            outcomes:test.outcomes,
            results: test_result,
            followup: {}
        }

        // for each outcome, run the next test....
        iter = iter+1;
        test.outcomes.forEach( (outcome) =>  {
            result.followup[outcome] = run_scenario_msamp(scenario.followup[outcome],testMap,test_result[outcome],year,iter);
        })
    }else {
        result.result = sample;
        result.action=scenario.action
        if (scenario.action=="followup"){
            result.in_year=scenario.years(year)+year
        } else {
            result.in_year=year
        }
    } 

    return result;
}

function run_scenario(scenario, testMap, sample, year, iter = 0) {
    // avoid infinite recursion...
    if (iter > max_iter) {
        throw new Error(`iter ${iter} >10.  Possible scenario problem`)
    }

    let result={};
    if (isTest(scenario)){
        let test = Test.fromName(scenario.test,testMap)
        console.log(scenario.test)
        console.table(test.config.probabilities(year))
        let test_result = test.run(sample,year);
        result = {
            outcomes:test.outcomes,
            results: test_result,
            followup: {}
        }

        // for each outcome, run the next test....
        iter = iter+1;
        test.outcomes.forEach( (outcome) =>  {
            result.followup[outcome] = run_scenario(scenario.followup[outcome],testMap,test_result[outcome],year,iter);
        })
    }else {
        result.result = sample;
        result.action=scenario.action
        if (scenario.action=="followup"){
            result.in_year=scenario.years(year)+year
        } else {
            result.in_year=year
        }
    } 

    return result;
}

function update_actions(results, action_accumulator) {
    switch (results.action) {
        case 'treat': {
            let year = results.in_year
            if (action_accumulator.treat[year]){
                action_accumulator.treat[year] = action_accumulator.treat[year].add(results.result);
            } else {
                action_accumulator.treat[year]=results.result;
            }
            break;
        }
        case 'followup': {
            let year = results.in_year
            if (action_accumulator.followup[year]){
                action_accumulator.followup[year]=action_accumulator.followup[year].add(results.result);
            }else{
                action_accumulator.followup[year]=results.result
            }
            break;
        }
        default:
            if (results.followup) {
                results.outcomes.forEach((outcome) => {
                    let res = update_actions(results.followup[outcome], action_accumulator)
                })
            }
    }
    return action_accumulator
}

let actions = {
    treat:[],
    followup:[]
};

/**
 * This is the problematic function.  It may not be able to be moved into a
 * module.  This may be either 1) specific to the scenario 2) specific to the app...
 * 
 * Consider moving this into the scenario file.
 * 
 * @param {Object} expected_counts - { expected:[ ... ],incident_risk[0.,...]}
 * @param {Number} year - an integer representing the follow up year.  The initial year is 0.
 * @param {Object} actions - {followup:[Sample,Sample,Sample...],treat:[Sample,Sample...]}
 * @param {Number} hpv_neg_year_0 The number of people who are HPV negative in year 0
 * @param {String} pos_label  - the HPV+ status label (CIN2/3)
 * @param {String} neg_label  - The HPV- label (CIN_LT_2/3)
 */
function getNextYearSample(expected_counts, year, actions, hpv_neg_year_0, pos_label,neg_label) {

    // the HPV negatives have TN, who are cancer free and can develop cancer...
    let y0_TN = hpv_neg_year_0.counts[neg_label]
    let y0_FN = hpv_neg_year_0.counts[pos_label]
    console.log(`Y0: TN: ${y0_TN} FN: ${y0_FN}`)

    // notFollowingUpYet is the sample of 
    // people that will come back, but not this year/
    /*
    let notFollowingUpYet = actions.followup.slice(year + 1).reduce((acc, res) => {
        if (res) {
            acc = (acc) ? acc.add(res) : res
        }
        return acc
    }, null)
    // NOTE: THIS IS SPECIFIC TO MY CASE!!!
    notFollowingUpYet = notFollowingUpYet.counts[label]
    */

    // this is the total number of expected counts...
    let pos_counts = expected_counts.expected[year];

    // The total for the next year is the number of people
    // who were told to follow up...
    let total = actions.followup[year].total;
    if (!total) {
        throw new Error(`Problem with the total number of people in year ${year}:`, total)
    }

    let total_treated = actions.treat.slice(0, year).reduce((acc, res) => acc.add(res))

    // start with the expected counts 
    // subtract the total number of treated
    // subtract the people who are not following up this year.
    // subtract the people who were previously cancer-free, tested hpv-, but
    //   developed cancer and are not yet following up. 
    // NOTE: THIS IS SPECIFIC TO MY CASE!!!
    let cnts = expected_counts.expected[year] - 
        total_treated.counts[pos_label] -
        y0_FN -
        y0_TN * expected_counts.incident_risk[year]


    let pojo = {}
    pojo[pos_label] = cnts
    return Sample.fromLabelTotal(total,pojo,neg_label)
}


// This is stuff that would in indx.js
function buildTableTitleElement(innerHTML){
    let h4Element = document.createElement("h4");
    h4Element.innerHTML = innerHTML;
    return h4Element;
}

HTMLTableRowElement.prototype.insertHead = function (index = -1) {
    const thElement = document.createElement('th');
    if (index === -1 || index >= this.cells.length) {
        this.appendChild(thElement);
    } else {
        // Insert the new <th> before the existing cell at the given index
        this.insertBefore(thElement, this.cells[index]);
    }
    return thElement;
}

function buildSampleTable(parentElement,title,sample,reset=false){
    if (reset){
        parentElement.innerText="";
    }

    //add a table header..
    let titleElement=buildTableTitleElement(title);
    parentElement.insertAdjacentElement("beforeend",titleElement);

    //now build the table...
    let tableElement = document.createElement("table");
    tableElement.classList.add("table","table-striped","table-hover")
    let headerRow = tableElement.insertRow();
    let dataRow = tableElement.insertRow();


    let CIN2 = (Sample.isSample(sample))?sample:sample.CIN2;
    Object.entries(CIN2.counts).forEach(([key, value]) => {
        let head = headerRow.insertHead();
        let cell = dataRow.insertCell();
        head.innerText = key;
        cell.innerText = value;
    })

    if (!Sample.isSample(sample)) {
        window.table = tableElement;
        let CIN3 = (Sample.isSample(sample))?sample:sample.CIN3;
        let head = headerRow.insertHead();
        let cell = dataRow.insertCell();
        head.innerText = "CIN3";
        cell.innerText = CIN3.counts.CIN3
    }

 
    let head=headerRow.insertHead();
    let cell=dataRow.insertCell();
    head.innerText="total";
    cell.innerText=CIN2.total;
    parentElement.insertAdjacentElement("beforeend",tableElement)
}

function buildResultsTable(parentElement,title,CIN2_results,CIN3_results){
    function addSampleToRow(sample,row){
        if (sample.counts.CIN_LT_2){
            let cell=row.insertCell();
            cell.innerText=sample.counts.CIN_LT_2
        }
        if (sample.counts.CIN2){
            let cell=row.insertCell();
            cell.innerText=sample.counts.CIN2
        }
        if (sample.counts.CIN3){
            let cell=row.insertCell();
            cell.innerText=sample.counts.CIN3
        }
    }

   
    function getResultSamples(result,prevous_res_str="",return_obj={outcomes:[],CIN_LT_2:{},CIN2:{},CIN3:{}}){
        if (!result.outcomes || result.outcomes.includes("COLPO_POSITIVE")){
            return return_obj
        }
        result.outcomes.forEach( (outcome) => {
            let sample=result.results[outcome];
            let res_str = prevous_res_str!=""?`${prevous_res_str}_${outcome}`:outcome;
            return_obj.outcomes.push(res_str)
            Object.entries(sample.counts).forEach( ([key,value])=> {
                return_obj[key][res_str]=value;
            })
            return_obj=getResultSamples(result.followup[outcome],res_str,return_obj)
        })
        
        return return_obj
    }

    // lets flatten the results...
    let results_obj = getResultSamples(CIN2_results)
    
    //add a table header..
    let titleElement=buildTableTitleElement(title);
    parentElement.insertAdjacentElement("beforeend",titleElement);
    
    //now build the table...
    let tableElement = document.createElement("table");
    tableElement.classList.add("table","table-striped","table-hover")
    let headerRow = tableElement.insertRow()
    let cell = headerRow.insertHead()
    results_obj.outcomes.forEach( (outcome) => {
        cell = headerRow.insertHead();
        cell.innerText=outcome;
    })
    
    Object.entries(results_obj).forEach( ([key,value]) =>{
        if (key != "outcomes" && key !="total"){
            let dataRow = tableElement.insertRow();
            cell = dataRow.insertCell()
            cell.innerText=key;
            results_obj.outcomes.forEach( (outcome) => {
                cell = dataRow.insertCell();
                let i = Math.round(value[outcome])
                cell.innerText=i?i:" ";
            })
        }
    });
    
    parentElement.insertAdjacentElement("beforeend",tableElement);    
}

function buildActionTable(parentElement,actions){
    //add a table header..
    let titleElement=buildTableTitleElement("Treat/Follow up");
    parentElement.insertAdjacentElement("beforeend",titleElement);

    //now build the table...
    let tableElement = document.createElement("table");
    tableElement.classList.add("table","table-striped","table-hover")
    let headerRow = tableElement.insertRow()

    //create a blank cell
    let cell = headerRow.insertHead()
    Object.keys(actions.treat[0].counts).forEach( (key)=>{
        cell = headerRow.insertHead()
        cell.innerText=key
    });
    cell = headerRow.insertHead()
    cell.innerText = 'total'

    parentElement.insertAdjacentElement("beforeend",tableElement)
    actions.treat.forEach( (year,indx) =>{
        let row = tableElement.insertRow();
        cell = row.insertCell();
        cell.innerText=`Treat ${indx==0?"initial year":"year "+indx}`
        Object.values(year.counts).forEach( (v)=>{
            cell = row.insertCell();
            cell.innerText=v;
        })
        cell = row.insertCell();
        cell.innerText=year.total;
    });
    actions.followup.forEach( (year,indx)=>{
        if (indx>0){
            let row = tableElement.insertRow();
            cell = row.insertCell();
            cell.innerText=`Followup year ${indx}`
            Object.values(year.counts).forEach( (v)=>{
                cell = row.insertCell();
                cell.innerText=v;
            })
        cell = row.insertCell();
        cell.innerText=year.total;
        }
    })

    return 0
}

function insertAccordion(accordionElement,year,{headerText="Year"}={}){
    // I need some element id's 
    let accordionItemId = `${accordionElement.id}_item_y${year}`;
    let accordionPanelId = `${accordionElement.id}_panel_y${year}`;
    
    // create the accordion-item...
    let item = document.createElement("div");
    item.id=accordionItemId

    // create the accordion-header
    let header = document.createElement("h4");
    let button = document.createElement("button")
    button.classList.add("accordion-button")
    button.type="button";
    button.dataset.bsToggle="collapse";
    button.dataset.bsTarget=`#${accordionPanelId}`;
    button.innerText=headerText;
    header.insertAdjacentElement("beforeend",button);

    // add the head to the accordion-item
    item.insertAdjacentElement("beforeend",header)

    // create the accordian-panel
    let panel = document.createElement("div")
    panel.id=accordionPanelId;
    panel.classList.add("accordion-collapse","collapse","p-4","border","border-thin","overflow-x-scroll");
    if (year==0) panel.classList.add("show");
    panel.dataset.bsParent=`#${accordionElement.id}`

    // create the body and add it to the panel...
    let accordionBody=document.createElement("div");
    accordionBody.classList.add("accordian-body");
    panel.insertAdjacentElement("beforeend",accordionBody);

    // add the accordion panel to the item...
    item.insertAdjacentElement("beforeend",panel)

    // add the accordion item to the accordion
    accordionElement.insertAdjacentElement("beforeend",item)

    return accordionBody;
}




const scenario4Element = document.getElementById("scenario-4-pane");
let sample_y0 = {
    CIN2:Sample.fromLabelTotal(counts.initial_enrollment,{CIN2:counts.CIN2.expected[0]},"CIN_LT_2"),
    CIN3:Sample.fromLabelTotal(counts.initial_enrollment,{CIN3:counts.CIN3.expected[0]},"CIN_LT_3")
}
buildSampleTable(scenario4Element,"Scenario 4 initial sample",sample_y0,true)
let scenario = newScenarios.scenario4;
let res0=run_scenario(scenario, testMap, sample_y0.CIN2,0);
let hpv_neg_year_0 = res0.results.HPV_NEGATIVE;
actions = update_actions(res0,actions)
console.log(hpv_neg_year_0)
buildResultsTable(scenario4Element,"Initial Year Results",res0)

console.log(" =========================== START YEAR 1 ===============================" )
let sample_y1_CIN2=getNextYearSample(counts.CIN2,1,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
buildSampleTable(scenario4Element,"Scenario 4 Year 1 sample",sample_y1_CIN2,false)
console.log(sample_y1_CIN2)
let res1=run_scenario(scenario, testMap, sample_y1_CIN2,1);
actions = update_actions(res1,actions)
console.log(res1)
buildResultsTable(scenario4Element,"Year 1 Results",res1)

console.log(" =========================== START YEAR 2 ===============================" )
let sample_y2_CIN2=getNextYearSample(counts.CIN2,2,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
console.log(sample_y2_CIN2)
buildSampleTable(scenario4Element,"Scenario 4 Year 2 sample",sample_y2_CIN2,false)
let res2=run_scenario(scenario, testMap, sample_y2_CIN2,2);
actions = update_actions(res2,actions)
console.log(res2)
buildResultsTable(scenario4Element,"Year 2 Results",res2)

console.log(" =========================== START YEAR 3 ===============================" )
let sample_y3_CIN2=getNextYearSample(counts.CIN2,3,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
console.log(sample_y3_CIN2)
buildSampleTable(scenario4Element,"Scenario 4 Year 3 sample",sample_y3_CIN2,false)
let res3=run_scenario(scenario, testMap, sample_y3_CIN2,3);
actions = update_actions(res3,actions)
console.log(res3)
buildResultsTable(scenario4Element,"Year 3 Results",res3)


const scenario2Element = document.getElementById("scenario-2-pane");
actions = {
    treat:[],
    followup:[]
};
console.log(" =========================== START Initial year  ===============================" )
let sample_y0_CIN2 = Sample.fromLabelTotal(counts.initial_enrollment,{CIN2:counts.CIN2.expected[0]},"CIN_LT_2")
buildSampleTable(scenario2Element,"Scenario 2 initial sample",sample_y0_CIN2,true)
scenario = newScenarios.scenario2;
res0=run_scenario(scenario, testMap, sample_y0_CIN2,0);
hpv_neg_year_0 = res0.results.HPV_NEGATIVE;
actions = update_actions(res0,actions)
console.log(hpv_neg_year_0)
buildResultsTable(scenario2Element,"Initial Year Results",res0)

console.log(" =========================== START YEAR 1 ===============================" )
sample_y1_CIN2=getNextYearSample(counts.CIN2,1,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
buildSampleTable(scenario2Element,"Scenario 2 Year 1 sample",sample_y1_CIN2,false)
console.log(sample_y1_CIN2)
res1=run_scenario(scenario, testMap, sample_y1_CIN2,1);
actions = update_actions(res1,actions)
console.log(res1)
buildResultsTable(scenario2Element,"Year 1 Results",res1)

console.log(" =========================== START YEAR 2 ===============================" )
sample_y2_CIN2=getNextYearSample(counts.CIN2,2,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
console.log(sample_y2_CIN2)
buildSampleTable(scenario2Element,"Scenario 2 Year 2 sample",sample_y2_CIN2,false)
res2=run_scenario(scenario, testMap, sample_y2_CIN2,2);
actions = update_actions(res2,actions)
console.log(res2)
buildResultsTable(scenario2Element,"Year 2 Results",res2)

console.log(" =========================== START YEAR 3 ===============================" )
sample_y3_CIN2=getNextYearSample(counts.CIN2,3,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
console.log(sample_y3_CIN2)
buildSampleTable(scenario2Element,"Scenario 2 Year 3 sample",sample_y3_CIN2,false)
res3=run_scenario(scenario, testMap, sample_y3_CIN2,3);
actions = update_actions(res3,actions)
console.log(res3)
buildResultsTable(scenario2Element,"Year 3 Results",res3)





function run_three_years(scenario, parentElement) {
    let actions = {
        treat: [],
        followup: []
    };

    function run_single_year(sample,year){
        let currentSample=sample[year]
        let titleYear=(year==0)?"Initial year":`Year ${year}`


        buildSampleTable(parentElement,`${scenario.scenarioName}: ${titleYear} Sample`,currentSample,false)
        let scenario_results=run_scenario_msamp(scenario, testMap, currentSample,year);
//        actions = update_actions(scenario_results,actions)
//        buildResultsTable(parentElement,`${titleYear} Results`,scenario_results)
//        return scenario_results;
    }
    
    
    console.log(" =========================== START Initial year  ===============================" )
    let sample = [{
        CIN2:Sample.fromLabelTotal(counts.initial_enrollment,{CIN2:counts.CIN2.expected[0]},"CIN_LT_2"),
        CIN3:Sample.fromLabelTotal(counts.initial_enrollment,{CIN3:counts.CIN3.expected[0]},"CIN_LT_3")
    }]
    let y0_results=run_single_year(sample,0)
/*    
    hpv_neg_year_0 = y0_results.results.HPV_NEGATIVE;
    
    console.log(" =========================== START YEAR 1 ===============================" )
    sample_CIN2=getNextYearSample(counts.CIN2,1,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
    run_single_year(sample_CIN2,1)  

    console.log(" =========================== START YEAR 2 ===============================" )
    sample_CIN2=getNextYearSample(counts.CIN2,2,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
    run_single_year(sample_CIN2,2)

    console.log(" =========================== START YEAR 3 ===============================" )
    sample_CIN2=getNextYearSample(counts.CIN2,3,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
    run_single_year(sample_CIN2,3)
*/
}

if (false) {
    run_three_years(newScenarios.scenario3,document.getElementById("scenario-3-pane"))
} else{
    const scenario3Element = document.getElementById("scenario-3-pane");
    actions = {
        treat: [],
        followup: []
    };
    console.log(" =========================== START Initial year  ===============================")
    sample_y0_CIN2 = Sample.fromLabelTotal(counts.initial_enrollment, { CIN2: counts.CIN2.expected[0] }, "CIN_LT_2")
    buildSampleTable(scenario3Element, "Scenario 3 initial sample", sample_y0_CIN2, true)
    scenario = newScenarios.scenario3;
    res0 = run_scenario(scenario, testMap, sample_y0_CIN2, 0);
    hpv_neg_year_0 = res0.results.HPV_NEGATIVE;
    actions = update_actions(res0, actions)
    console.log(hpv_neg_year_0)
    buildResultsTable(scenario3Element, "Initial Year Results", res0)

    console.log(" =========================== START YEAR 1 ===============================")
    sample_y1_CIN2 = getNextYearSample(counts.CIN2, 1, actions, hpv_neg_year_0, "CIN2", "CIN_LT_2")
    buildSampleTable(scenario3Element, "Scenario 3 Year 1 sample", sample_y1_CIN2, false)
    console.log(sample_y1_CIN2)
    res1 = run_scenario(scenario, testMap, sample_y1_CIN2, 1);
    actions = update_actions(res1, actions)
    console.log(res1)
    buildResultsTable(scenario3Element, "Year 1 Results", res1)

    console.log(" =========================== START YEAR 2 ===============================")
    sample_y2_CIN2 = getNextYearSample(counts.CIN2, 2, actions, hpv_neg_year_0, "CIN2", "CIN_LT_2")
    console.log(sample_y2_CIN2)
    buildSampleTable(scenario3Element, "Scenario 3 Year 2 sample", sample_y2_CIN2, false)
    res2 = run_scenario(scenario, testMap, sample_y2_CIN2, 2);
    actions = update_actions(res2, actions)
    console.log(res2)
    buildResultsTable(scenario3Element, "Year 2 Results", res2)

    console.log(" =========================== START YEAR 3 ===============================")
    sample_y3_CIN2 = getNextYearSample(counts.CIN2, 3, actions, hpv_neg_year_0, "CIN2", "CIN_LT_2")
    console.log(sample_y3_CIN2)
    buildSampleTable(scenario3Element, "Scenario 3 Year 3 sample", sample_y3_CIN2, false)
    res3 = run_scenario(scenario, testMap, sample_y3_CIN2, 3);
    actions = update_actions(res3, actions)
    console.log(res3)
    buildResultsTable(scenario3Element, "Year 3 Results", res3)
}



scenario = newScenarios.scenario1;
actions = {
    treat:[],
    followup:[]
};
const scenario1Accordion = document.getElementById("scenario-1-accordion");
let scenario1AccordionItem = insertAccordion(scenario1Accordion,0,{headerText:"Initial Enrollment"})
sample_y0_CIN2 = Sample.fromLabelTotal(counts.initial_enrollment,{CIN2:counts.CIN2.expected[0]},"CIN_LT_2")
buildSampleTable(scenario1AccordionItem,"Scenario 1 initial sample",sample_y0_CIN2,false)
res0=run_scenario(scenario, testMap, sample_y0_CIN2,0);
hpv_neg_year_0 = res0.results.HPV_NEGATIVE;
actions = update_actions(res0,actions)
buildResultsTable(scenario1AccordionItem,"Initial Year Results",res0)

console.log(" =========================== START YEAR 1 ===============================" )
scenario1AccordionItem = insertAccordion(scenario1Accordion,1,{headerText:"Year 1"})
sample_y1_CIN2=getNextYearSample(counts.CIN2,1,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
buildSampleTable(scenario1AccordionItem,"Scenario 1 Year 1 sample",sample_y1_CIN2,false)
console.log(sample_y1_CIN2)
res1=run_scenario(scenario, testMap, sample_y1_CIN2,1);
actions = update_actions(res1,actions)
console.log(res1)
buildResultsTable(scenario1AccordionItem,"Year 1 Results",res1)

console.log(" =========================== START YEAR 2 ===============================" )
scenario1AccordionItem = insertAccordion(scenario1Accordion,2,{headerText:"Year 2"})
sample_y2_CIN2=getNextYearSample(counts.CIN2,2,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
buildSampleTable(scenario1AccordionItem,"Scenario 1 Year 2 sample",sample_y2_CIN2,false)
console.log(sample_y2_CIN2)
res2=run_scenario(scenario, testMap, sample_y2_CIN2,2);
actions = update_actions(res2,actions)
console.log(res2)
buildResultsTable(scenario1AccordionItem,"Year 2 Results",res2)

console.log(" =========================== START YEAR 3 ===============================" )
scenario1AccordionItem = insertAccordion(scenario1Accordion,3,{headerText:"Year 3"})
sample_y3_CIN2=getNextYearSample(counts.CIN2,3,actions,hpv_neg_year_0,"CIN2","CIN_LT_2")
buildSampleTable(scenario1AccordionItem,"Scenario 1 Year 3 sample",sample_y2_CIN2,false)
console.log(sample_y3_CIN2)
res3=run_scenario(scenario, testMap, sample_y3_CIN2,3);
actions = update_actions(res3,actions)
console.log(res3)
buildResultsTable(scenario1AccordionItem,"Year 3 Results",res3)

const scenario1Element = document.getElementById("scenario-1-pane");
buildActionTable(scenario1Element,actions);


/*
scenario = newScenarios.scenario7;

let res_scenario7_0=run_scenario(scenario, testMap, sample_y0_CIN2,0);
let hpv7_neg_year_0 = res0.results.HPV_NEGATIVE;
let actions7 = {
    treat:[],
    followup:[]
};
*/