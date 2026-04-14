import { newScenarios, defaultTestMap, defaultTestParameters, counts,isTest, adjustableTests } from './scenarios.js'
import {Sample, Multisample} from './sample.js'
import { Test } from './test.js';

let userParams= new Map();
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
        let customParams = userParams.get(scenario.test) || {};
        console.table(test.config.probabilities(year,customParams))
        let test_result = test.run(sample,year,customParams);
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


function update_params(testName, param){
    userParams.set(testName, param)
}
function reset_params(testName){
    userParams.delete(testName)
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

function addScenarioName(parentElement,scenarioName){
    let scenarioNameElement=buildTableTitleElement(scenarioName);        
    scenarioNameElement.classList.add("text-center")
    parentElement.insertAdjacentElement("beforeend",scenarioNameElement);
}

function buildSampleTable(parentElement,title,sample){

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



function run_three_years(scenario_key, parentElement) {
    let scenario = newScenarios[scenario_key];
    let actions = {
        treat: [],
        followup: []
    };
    let scenario_results= new Array(4)

    function run_single_year(sample,year){
        let currentSample=sample[year]
        let titleYear=(year==0)?'Initial Year':`Year ${year}`
        buildSampleTable(parentElement,`${titleYear} Sample`,currentSample)
        
        scenario_results[year] = run_scenario(scenario, defaultTestMap, sample[year],year) ;
        actions = update_actions(scenario_results[year],actions)

        buildResultsTable(parentElement,`${titleYear} Results`,scenario_results[year])
        return scenario_results;
    }
    
    buildParameterSetting(parentElement,scenario_key);
    //addScenarioName(parentElement,scenario.scenarioName)
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
    buildParameterSetting(scenario1Element,"scenario1");
    //addScenarioName(scenario1Element,scenario.scenarioName)
    buildSampleTable(scenario1Element,"Scenario 1 initial sample",sample[0],true,scenario.scenarioName)
    results.push(run_scenario(scenario, defaultTestMap, sample[0],0) );
    actions = update_actions(results[0],actions)
    buildResultsTable(scenario1Element,"Initial Year Results",results[0])

    scenario = newScenarios.scenario1
    for (let year=1;year<4;year++){
        sample.push( getNextYearSample(counts,year,actions,results) )

        let currentSample=sample[year]
        let titleYear=`Year ${year}`
        buildSampleTable(scenario1Element,`${titleYear} Sample`,currentSample,false)
        
        results[year] = run_scenario(scenario, defaultTestMap, sample[year],year) ;
        actions = update_actions(results[year],actions)
        
        buildResultsTable(scenario1Element,`${titleYear} Results`,results[year])
    }
}

function runAllScenarios(){
    const scenario4Element = document.getElementById("scenario-4-pane");
    run_three_years("scenario4", scenario4Element);
    const scenario2Element = document.getElementById("scenario-2-pane");
    run_three_years("scenario2", scenario2Element);
    const scenario3Element = document.getElementById("scenario-3-pane");
    run_three_years("scenario3", scenario3Element);
    const scenario5Element = document.getElementById("scenario-5-pane");
    run_three_years("scenario5", scenario5Element);
    const scenario6Element = document.getElementById("scenario-6-pane");
    run_three_years("scenario6", scenario6Element);
    run_scenario1()
}


buildCommandLine();
runAllScenarios();


function buildCommandLine(){
    const container = document.getElementById("command-bar");
    container.innerHTML="";

    container.className = 'd-flex justify-content-between align-items-center bg-white border-bottom py-2 px-3 sticky-top';
    container.style.zIndex = "1050"; 
    container.style.top = "0";

    const title = document.createElement('h5');
    title.className = 'mb-0 fw-bold text-dark';
    title.style.fontSize = '0.9rem';
    title.textContent = 'Risk Visualization';
    const actionGroup = document.createElement('div');
    actionGroup.className = 'd-flex gap-2';
    const resetAllBtn = document.createElement('button');
    resetAllBtn.className = 'btn btn-outline-secondary btn-sm border-0';
    resetAllBtn.style.fontSize = '0.7rem';
    resetAllBtn.textContent = 'Reset All Test Parameters';
    resetAllBtn.onclick = () => {
        //if(confirm("Clear all custom parameters?")) {
            userParams.clear();
            location.reload(); // Hard reset to refresh UI states
        //}
    };

    const rerunBtn = document.createElement('button');
    rerunBtn.className = 'btn btn-primary btn-sm fw-bold px-4 shadow-sm';
    rerunBtn.style.fontSize = '0.75rem';
    rerunBtn.innerHTML = '&#9654; RUN SIMULATION';
    rerunBtn.onclick = (e) => runAllScenarios(e);

    actionGroup.appendChild(resetAllBtn);
    actionGroup.appendChild(rerunBtn);
    
    container.appendChild(title);
    container.appendChild(actionGroup);

    return container;
}
function buildParameterSetting(parentElement, scenario_key) {
    parentElement.innerHTML = '';
    const config = adjustableTests[scenario_key];
    if (!config) return;
    const scenario_name = newScenarios[scenario_key].scenarioName;

    // 1. Create the Toggle Button (with Unicode Gear)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-small btn-outline-secondary border-0 btn-sm mb-2 fw-bold d-flex align-items-center';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('data-bs-toggle', 'collapse');
    const collapseId = `collapse-settings-${scenario_key}`;
    toggleBtn.setAttribute('data-bs-target', `#${collapseId}`);
    toggleBtn.innerHTML = `<span class="me-0" style="font-size: 1.1rem;">&#9881;</span>`;
    // 1.a Wrap the Toggle Button and the scenario title in a grid...
    const toolbarDiv = document.createElement("div");
    toolbarDiv.className='d-grid align-items-center mb-3';
    toolbarDiv.style.gridTemplateColumns = 'min-content 1fr min-content';
    toolbarDiv.innerHTML=`
    <div class="invisible" aria-hidden="true">
        <button class="btn btn-sm btn-outline-secondary border-0 px-2" tabindex="-1">
            <span class="me-0" style="font-size: 1.1rem;">&#9881;</span>
        </button>
    </div>
    <div class="text-center px-3">
        <h5 class="fw-bold mb-0">${scenario_name}</h5>
    </div>
    <div class="text-end" id="btn-slot-${scenario_key}"></div>
    `
    toolbarDiv.querySelector(`#btn-slot-${scenario_key}`).insertAdjacentElement("beforeend",toggleBtn)


    // 2. Create the Collapse Container
    const collapseWrapper = document.createElement('div');
    collapseWrapper.className = 'collapse mb-4';
    collapseWrapper.id = collapseId;

    // 3. Inner card-style body for the tabs
    collapseWrapper.innerHTML = `
        <div class="card card-body bg-light border-0 shadow-sm p-3">
            <ul class="nav nav-tabs border-bottom-0 mb-3" id="tablist-${scenario_key}" role="tablist" style="font-size: 0.75rem;">
            </ul>
            <div class="tab-content" id="content-${scenario_key}">
            </div>
        </div>
    `;

    parentElement.appendChild(toolbarDiv);
    parentElement.appendChild(collapseWrapper);

    // 4. Grab references to the new containers
    const tabList = collapseWrapper.querySelector(`#tablist-${scenario_key}`);
    const tabContent = collapseWrapper.querySelector(`#content-${scenario_key}`);

    // 5. Loop through and build Nav + Panes
    config.forEach((test_key, index) => {
        const isActive = index === 0;
        const safeId = `pane-${scenario_key}-${test_key.replace(/\s+/g, '-')}`;

        // Create the Tab Link (Underline Style)
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.innerHTML = `
            <button class="settings-tab nav-link border-0 border-bottom border-3 ${isActive ? 'active fw-bold' : ''}" 
                data-bs-toggle="tab" data-bs-target="#${safeId}" 
                aria-controls="${safeId}" aria-selected="${isActive}"
                type="button" role="tab">
                ${test_key.replace(/_/g, ' ')}
            </button>
        `;
        tabList.appendChild(navItem);

        // Create the Pane
        const pane = document.createElement('div');
        pane.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
        pane.id = safeId;

        // 6. Build the Test UI and append it to the LIVE pane
        const testUI = buildTestUI(scenario_key, test_key);
        pane.appendChild(testUI);
        tabContent.appendChild(pane);
    });
}



function buildTestUI(scenario_key, test_key) {
    const testContainer = document.createElement('div');
    // REMOVED 'card' from classList if you want a flatter look, 
    // but kept it here as requested to maintain the "card look"
    testContainer.classList.add('card', 'border-0', 'shadow-sm', 'p-3', 'rounded-3', 'bg-white');

    const headerWrapper = document.createElement('div');
    // Hide the header text if the tab name already covers it, or keep for clarity
    headerWrapper.className = 'd-flex justify-content-between align-items-center border-bottom pb-2 mb-2';

    const header = document.createElement('h6');
    header.className = 'fw-bold text-primary mb-0';
    header.style.fontSize = '0.85rem';
    header.textContent = `${test_key.replace(/_/g, ' ')} Parameters`;
    
    // ... (rest of resetBtn logic remains the same)
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-link btn-sm text-muted p-0 text-decoration-none';
    resetBtn.style.fontSize = '0.65rem';
    resetBtn.innerHTML = '&#8634; Reset to Defaults';
    resetBtn.onclick = () => resetTestInputs(testContainer);

    headerWrapper.appendChild(header);
    headerWrapper.appendChild(resetBtn);
    testContainer.appendChild(headerWrapper);

    const paramsMap = defaultTestParameters.get(test_key);
    const activeParamsMap = userParams.get(test_key) ?? defaultTestParameters.get(test_key);
    if (paramsMap) {
        for (const [category, activeParams] of Object.entries(activeParamsMap)) {
            let defaultParams = paramsMap[category];
            const catRow = document.createElement('div');
            catRow.classList.add('mt-3');

            // Category Label (CIN2, CIN3)
            const catLabel = document.createElement('div');            
            catLabel.className = 'small fw-bold text-muted text-uppercase mb-1';
            catLabel.style.fontSize = '0.65rem';
            catLabel.textContent = category;
            catRow.appendChild(catLabel);

            const inputFlexWrapper = document.createElement('div');
            inputFlexWrapper.classList.add('d-flex', 'flex-row', 'flex-wrap', 'gap-2')

             for (const [paramName, value] of Object.entries(activeParams)) {
                const defaultValue = defaultParams[paramName];
                // Create the compact input group
                const inputGroup = createCompactInput(test_key, category, paramName, value, defaultValue);
                inputFlexWrapper.appendChild(inputGroup);
            }

            catRow.appendChild(inputFlexWrapper);
            testContainer.appendChild(catRow);
        }
    }
    return testContainer;
}

/*
function buildParameterSetting_V1(parentElement, scenario_key) {
    parentElement.innerHTML = '';
    const config = adjustableTests[scenario_key];
    if (!config) return;

    const settingsAccordion = document.createElement('div');
    settingsAccordion.className = 'accordion mb-4';
    settingsAccordion.id = `settings-wrapper-${scenario_key}`;
    const collapseId = `collapse-settings-${scenario_key}`;

    // 1. Build the Accordion Frame
    settingsAccordion.innerHTML = `
        <div class="accordion-item border-0 shadow-sm">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed text-dark fw-bold py-2" 
                        type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    <i class="bi bi-sliders me-2"></i> Settings
                </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse">
                <div class="accordion-body bg-light p-3">
                    <ul class="nav nav-tabs border-bottom-0 mb-3" id="tablist-${scenario_key}" role="tablist" style="font-size: 0.75rem;">
                    </ul>
                    <div class="tab-content" id="content-${scenario_key}">
                    </div>
                </div>
            </div>
        </div>
    `;

    parentElement.appendChild(settingsAccordion);

    // 2. Grab references to the new containers
    const tabList = settingsAccordion.querySelector(`#tablist-${scenario_key}`);
    const tabContent = settingsAccordion.querySelector(`#content-${scenario_key}`);

    // 3. Loop through and build Nav + Panes
    config.forEach((test_key, index) => {
        const isActive = index === 0;
        const safeId = `pane-${scenario_key}-${test_key.replace(/\s+/g, '-')}`;

        // Create the Tab Link (Underline Style)
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.innerHTML = `
            <button class="settings-tab nav-link border-0 border-bottom border-3 ${isActive ? 'active' : ''}" 
                data-bs-toggle="tab" data-bs-target="#${safeId}" 
                aria-controls="${safeId}" aria-selected="${isActive}"
                type="button" role="tab">
                ${test_key.replace(/_/g, ' ')}
            </button>
        `;
        tabList.appendChild(navItem);

        // Create the Pane
        const pane = document.createElement('div');
        pane.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
        pane.id = safeId;

        // 4. IMPORTANT: Build the Test UI and append it to the LIVE pane
        const testUI = buildTestUI(scenario_key, test_key);
        pane.appendChild(testUI);
        tabContent.appendChild(pane);
    });
}
function buildParameterSetting_V0(parentElement,scenario_key){
    parentElement.innerHTML = '';
    const config = adjustableTests[scenario_key];
    if (!config) return;

    const settingsAccordion = document.createElement('div');
    settingsAccordion.classList.add('accordion', 'mb-4');
    settingsAccordion.id = `settings-wrapper-${scenario_key}`;
    const collapseId = `collapse-settings-${scenario_key}`

    settingsAccordion.innerHTML = `
        <div class="accordion-item border-primary shadow-sm">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed bg-primary-subtle fw-bold py-2" 
                        type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    <i class="bi bi-sliders me-2"></i> Settings
                </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse">
                <div class="accordion-body bg-light p-3">
                    <div id="test-list-${scenario_key}" class="d-flex flex-column gap-3">
                    </div>
                </div>
            </div>
        </div>
    `;

    parentElement.appendChild(settingsAccordion);

    const listContainer = settingsAccordion.querySelector(`#test-list-${scenario_key}`);

    const flexRow = document.createElement('div');
    flexRow.classList.add('d-flex', 'flex-row', 'flex-wrap', 'gap-3', 'justify-content-start');
    listContainer.appendChild(flexRow);

    config.forEach(test_key => {
        const testUI = buildTestUI(scenario_key, test_key);
        flexRow.appendChild(testUI);
    });
}

function buildTestUI(scenario_key, test_key) {
    const testContainer = document.createElement('div');
    testContainer.classList.add('card','border','p-2','rounded-2');

    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'd-flex justify-content-between align-items-center border-bottom';

    const header = document.createElement('h6');
    header.className = 'fw-bold text-secondary';
    header.textContent = test_key.replace('_', ' ');
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-link btn-sm text-muted p-0 text-decoration-none';
    resetBtn.style.fontSize = '0.65rem';
    resetBtn.innerHTML = '&#8634; Reset'; // Unicode for counter-clockwise arrow
    resetBtn.onclick = () => resetTestInputs(testContainer);

    headerWrapper.appendChild(header);
    headerWrapper.appendChild(resetBtn)
    testContainer.appendChild(headerWrapper);

    const paramsMap = defaultTestParameters.get(test_key);
    const activeParamsMap = userParams.get(test_key) ?? defaultTestParameters.get(test_key);
    

    if (paramsMap) {
        for (const [category, activeParams] of Object.entries(activeParamsMap)) {
            let defaultParams = paramsMap[category];
            const catRow = document.createElement('div');
            catRow.classList.add('mt-3');

            // Category Label (CIN2, CIN3)
            const catLabel = document.createElement('div');            
            catLabel.className = 'small fw-bold text-muted text-uppercase mb-1';
            catLabel.style.fontSize = '0.65rem';
            catLabel.textContent = category;
            catRow.appendChild(catLabel);

            const inputFlexWrapper = document.createElement('div');
            inputFlexWrapper.classList.add('d-flex', 'flex-row', 'flex-wrap', 'gap-2')

             for (const [paramName, value] of Object.entries(activeParams)) {
                const defaultValue = defaultParams[paramName];
                // Create the compact input group
                const inputGroup = createCompactInput(test_key, category, paramName, value, defaultValue);
                inputFlexWrapper.appendChild(inputGroup);
            }

            catRow.appendChild(inputFlexWrapper);
            testContainer.appendChild(catRow);
        }
    }
    return testContainer;
}
*/
function createCompactInput(test, cat, param, val,def) {
    const wrapper = document.createElement('div');
    // Flex-basis allows them to sit side-by-side
    wrapper.classList.add('d-flex', 'flex-column');
    wrapper.style.flex = "1 1 120px"; 
    wrapper.style.maxWidth = "200px";

    const isFollowup = param === 'followup_specificity';
    const tooltipAttr = isFollowup 
        ? 'data-bs-toggle="tooltip" data-bs-placement="top" title="Specificity for patients in the surveillance/follow-up pathway."' 
        : '';
    const tooltipIcon = isFollowup?'<span class="ms-1 text-primary fw-bold" style="font-size: 0.6rem;">&#9432;</span>':''

    wrapper.innerHTML = `
        <label class="text-muted mb-0 align-items-center" 
            style="font-size: 0.6rem; letter-spacing: 0.02rem;" ${tooltipAttr}>
        ${param.replace('_', ' ')} ${tooltipIcon}
        </label>
        <input type="number"
               step="any"
               min="0"
               max="1" 
               class="form-control form-control-sm font-monospace border-0 border-bottom bg-light px-1" 
               value="${val}" 
               data-test="${test}" 
               data-cat="${cat}" 
               data-param="${param}"
               data-default="${def}"
               spellcheck="false"
               style="font-size: 0.8rem; border-radius: 0; height: 24px;"
               >
    `;
    const input = wrapper.querySelector('input');
    input.addEventListener('change',function(){
        let value = parseFloat(this.value);
        const defaultVal = parseFloat(this.getAttribute('data-default'));
        if (value > 1) this.value = 1;
        if (value < 0) this.value = 0;

        const testVals = userParams.getOrInsertComputed(test, () => {
            // This creates a NEW memory reference. 
            // Defaults are now safe from accidental mutation.
            return structuredClone(defaultTestParameters.get(test));
        });
        testVals[cat][param] = parseFloat(this.value);
    });

    return wrapper;
}

function validateProbability(x){
    console.log("validatating ",x)
}
function resetTestInputs(container) {
    const inputs = container.querySelectorAll('input[data-default]');
    inputs.forEach(input => {
        const defaultValue = input.getAttribute('data-default');
        input.value = defaultValue;
        
        // Optional: Flash the input green to show it was reset
        input.style.transition = 'background-color 0.5s';
        input.style.backgroundColor = '#d1e7dd'; // Bootstrap success-subtle
        setTimeout(() => {
            input.style.backgroundColor = '';
        }, 500);
    });
    
    // If you are using a Map to track changes, you'll want to clear the entry 
    // for this test so the simulation pulls from defaults again.
    const firstInput = inputs[0];
    if (firstInput) {
        const testKey = firstInput.dataset.test;
        userParams.delete(testKey);
    }
}

// Just to be safe...
if (!Map.prototype.getOrInsertComputed) {
    Map.prototype.getOrInsertComputed = function(key, callback) {
        if (this.has(key)) return this.get(key);
        const value = callback(key);
        this.set(key, value);
        return value;
    };
}