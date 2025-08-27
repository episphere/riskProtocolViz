import { newScenarios, testMap, counts,isTest } from './scenarios.js'
import {Sample, Multisample} from './sample.js'
import { Test } from './test.js';


const max_iter = 10;
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
        if (scenario.scenarioName == "Primary HPV screening with extended genotyping triaged with Dual Stain"){
            console.log("================== ")
            console.log(test_result)
        }
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


function getNextYearSample(expected_counts,year,actions,yearly_results){

    // get the year 0 true negatives and true positives...
    let y0_TN = {
        CIN2: yearly_results[0].results['HPV_NEGATIVE'].counts.CIN_LT_2,
        // we don't usually use CIN_LT_3 so it is not in counts..
        CIN3: yearly_results[0].results['HPV_NEGATIVE'].samples[1].counts.CIN_LT_3
    };
    let y0_FN = {
        CIN2:yearly_results[0].results['HPV_NEGATIVE'].counts.CIN2,
        CIN3:yearly_results[0].results['HPV_NEGATIVE'].counts.CIN3,
    }

    // make a sample for the CIN2 + CIN3
    let pos_counts = {
        CIN2:expected_counts.CIN2.expected[year],
        CIN3:expected_counts.CIN3.expected[year],
    }
    let total = actions.followup[year].total;
    let total_treated = actions.treat.slice(0, year).reduce((acc, res) => acc.add(res))

    let groups=["CIN2","CIN3"]
    let otherLabels=["CIN_LT_2","CIN_LT_3"]
    let cnts = groups.map( (group) =>{
        // expected counts
        return pos_counts[group] -
            // less treated
            total_treated.counts[group] -
            // less the False Negatives..
            y0_FN[group] -
            // less the new cases who have a long followup
            y0_TN[group]*expected_counts[group].incident_risk[year]
    })
    .map((cnt,indx)=>Sample.fromLabelTotal(total,{[groups[indx]]:cnt},otherLabels[indx]) )
    return Multisample.build_from_samples(cnts,["CIN_LT_2","CIN2","CIN3"])
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

function buildSampleTable(parentElement,title,sample,reset=false,scenarioName=""){
    if (reset){
        parentElement.innerText="";
        let scenarioNameElement=buildTableTitleElement(scenarioName);        
        scenarioNameElement.classList.add("text-center")
        parentElement.insertAdjacentElement("beforeend",scenarioNameElement);
    }

    //add a table header..
    let titleElement=buildTableTitleElement(title);
    parentElement.insertAdjacentElement("beforeend",titleElement);

    //now build the table...
    let tableElement = document.createElement("table");
    tableElement.classList.add("table","table-striped","table-hover")
    let headerRow = tableElement.insertRow();
    let dataRow = tableElement.insertRow();


    //let CIN2 = (Sample.isSample(sample))?sample:sample.CIN2;
    Object.entries(sample.counts).forEach(([key, value]) => {
        let head = headerRow.insertHead();
        let cell = dataRow.insertCell();
        head.innerText = key;
        cell.innerText = value;
    })

    if (!Sample.isSample(sample) && !Multisample.isMultisample(sample)) {
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
    cell.innerText=sample.total;
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



function run_three_years(scenario, parentElement) {
    let actions = {
        treat: [],
        followup: []
    };
    let scenario_results= new Array(4)

    function run_single_year(sample,year){
        let currentSample=sample[year]
        let titleYear=(year==0)?'Initial Year':`Year ${year}`
        buildSampleTable(parentElement,`${titleYear} Sample`,currentSample,year==0,scenario.scenarioName)
        
        scenario_results[year] = run_scenario(scenario, testMap, sample[year],year) ;
        actions = update_actions(scenario_results[year],actions)

        buildResultsTable(parentElement,`${titleYear} Results`,scenario_results[year])
        return scenario_results;
    }
    
    let initial_sample = Multisample.build(
        { CIN2: counts.CIN2.expected[0], CIN_LT_2: counts.initial_enrollment - counts.CIN2.expected[0] },
        {
            values: { CIN3: counts.CIN3.expected[0] },
            missingLabel: "CIN_LT_3"
        })
    let sample=[initial_sample]
    
    for (let year=0;year<4;year++){
        if (year != 0) {
            sample.push( getNextYearSample(counts,year,actions,scenario_results) )
        }
        run_single_year(sample,year);
    }
    
}

function run_scenario1(){
    const scenario1Element = document.getElementById("scenario-1-pane");
    let actions = {
        treat: [],
        followup: []
    };
    
    let sample = [Multisample.build(
        { CIN2: counts.CIN2.expected[0], CIN_LT_2: counts.initial_enrollment - counts.CIN2.expected[0] },
        {
            values: { CIN3: counts.CIN3.expected[0] },
            missingLabel: "CIN_LT_3"
        }
    )]
    let results=[]
    let scenario = newScenarios.scenario1_y0;
    buildSampleTable(scenario1Element,"Scenario 1 initial sample",sample[0],true,scenario.scenarioName)
    results.push(run_scenario(scenario, testMap, sample[0],0) );
    actions = update_actions(results[0],actions)
    buildResultsTable(scenario1Element,"Initial Year Results",results[0])

    scenario = newScenarios.scenario1
    for (let year=1;year<4;year++){
        sample.push( getNextYearSample(counts,year,actions,results) )

        let currentSample=sample[year]
        let titleYear=`Year ${year}`
        buildSampleTable(scenario1Element,`${titleYear} Sample`,currentSample,false)
        
        results[year] = run_scenario(scenario, testMap, sample[year],year) ;
        actions = update_actions(results[year],actions)
        
        buildResultsTable(scenario1Element,`${titleYear} Results`,results[year])
    }
}

const scenario4Element = document.getElementById("scenario-4-pane");
run_three_years(newScenarios.scenario4, scenario4Element);
const scenario2Element = document.getElementById("scenario-2-pane");
run_three_years(newScenarios.scenario2, scenario2Element);
const scenario3Element = document.getElementById("scenario-3-pane");
run_three_years(newScenarios.scenario3, scenario3Element);
const scenario5Element = document.getElementById("scenario-5-pane");
run_three_years(newScenarios.scenario5, scenario5Element);
const scenario6Element = document.getElementById("scenario-6-pane");
run_three_years(newScenarios.scenario6, scenario6Element);

run_scenario1()