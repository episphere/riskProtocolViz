import {scenario,hpv_after_post_hpv_probabilities} from './scenarios.js'
// counts is an object that contains all the case { C1:n1, C2:n2, ... }
// do not assume all n's add up to the total
class Sample {
    constructor(counts) {
        this.counts = counts
        if (Object.hasOwn(counts,"counts")) throw new Error("ERROR CREATING SAMPLE!!!")
    }

    get labels() {
        return Object.keys(this.counts)
    }

    add(otherSample) {
        // treat not samples as "0"
        if (!(otherSample instanceof Sample)) return this;


        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = this.counts[key] + otherSample.counts[key];
            return acc;
        }, {})
        return new Sample(cnts)
    }

    subtract(otherSample){
        if (! (otherSample instanceof Sample) ) {
            console.error("This: ",this);
            console.error("Trying to subtract :",otherSample)
            throw new Error(`Error subtracting from a sample`)
        }

        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = this.counts[key] - otherSample.counts[key];
            return acc;
        }, {})
        return new Sample(cnts)
    }

    scale(factor){
        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = factor * this.counts[key];
            return acc;
        }, {})
        return new Sample(cnts)
    }

    toString(){
        return Object.entries(this.counts).reduce( (acc,[key,value]) =>{
            acc = acc + `${key}:${value} `
            return acc;
        },"Sample: [ " )+" ]"
    }
}

class Test {
    static newTest(name,probs) {
        let result_labels = [];
        Object.keys(probs).forEach((key, index) => {
            if (index == 0) {
                // fill the possible results
                result_labels = Object.keys(probs[key])
            } else {
                let current_labels = Object.keys(probs[key])
                // all keys better be in results_labels...
                let ok = current_labels.every((k) => result_labels.includes(k)) &&
                    result_labels.every((k) => current_labels.includes(k))
                if (!ok) throw new Error(`the labels of probs are not the same for each results`)
            }
            let totalP = Object.values(probs[key]).reduce((x, y) => x + y)
            if (Math.abs(1. - totalP) > 1.e-5) {
                throw new Error(`Probs dont add up to 1 for class: ${key}\n${JSON.stringify(probs[key])}`)
            }

        });
        return new Test(name,probs, result_labels)
    }

    constructor(name,probs, labels) {
        this.name = name
        this.probs = probs
        this.labels = labels
    }


    run(sample) {
        // for each possible result...
        return this.labels.reduce((acc, result_label) => {
            let cnts = {}
            // get the result sample...
            sample.labels.forEach((sample_label) => {
                cnts[sample_label] = sample.counts[sample_label] * this.probs[sample_label][result_label]
            })
            acc[result_label] = new Sample(cnts)
            return acc;
        }, {})
    }
}

const max_iter=10;
function run_scenario(scenario,sample,iter=0){
    // avoid infinite recursion...
    if (iter>max_iter) {
        throw new Error(`iter ${iter} >10.  Possible scenario problem`)
    }

    let result = {};
    if (scenario.test){
        let test = Test.newTest(scenario.testname,scenario.probabilities);
        let test_result = test.run(sample)
        result={
            outcomes:test.labels,
            results: test_result,
            followup: {}
        };

        // for each outcome, run the next test....
        iter = iter+1;
        test.labels.forEach( (label) =>  {
            result.followup[label] = run_scenario(scenario.result[label],test_result[label],iter);
        })
    } else {
        result.action = scenario.treat?"treat":"return";
        result.result = sample;
        if (scenario.followup) result.year=scenario.followup
    }

    return result
}


function get_actions(results,year,acc={treat:null,return:[]}) {
    switch (results.action) {
        case 'treat': {
            acc.treat = (acc.treat) ? acc.treat.add(results.result) : results.result
            break;
        }
        case 'return': {
            console.log(`Returning in ${results.year} or year ${results.year+year}`, results.result);
            acc.return[results.year + year] = (acc.return[results.year+year]) ? acc.return[results.year+year].add(results.result ) : results.result;
            console.log(acc)
            break;
        }
        case undefined: {
            if (results.followup) {
                // check to see if I have treated/returns...
                results.outcomes.forEach((outcome) => {
                    let res=get_actions(results.followup[outcome],year,acc)
                })
            }
            break;
        }
        default: 
        throw new Error("Parsing Error in ",results)
    }

    return acc
}


// the expected sample comes from the 
// scenario.sample
function getNextYearSample(scenario, year, previous_followup,disease_negative_year0) {

    // notFollowingUpYet is the sample of 
    // people that will come back, but not this year/
    let notFollowingUpYet = previous_followup.return.slice(year+1).reduce( (acc,res) => {
        if (res) {
            console.log("====> ",res," ====> ",acc)
            acc = (acc)?acc.add(res):res
        } 
        return acc
    })

    // People where disease negative that contract cancer
    // but already tested positive (should be notFollowing up CIN_LT_2)
    // but our rules say Y0.  This is where I need to know what the 
    // sample is. 
    let newCases = new Sample(scenario.incident_risk[year]).scale(disease_negative_year0)


    // start with the expected number
    let sample = new Sample(scenario.sample[year])
        // subtract the number of people treated...
        .subtract(previous_followup.treat)
        // subtract the number of people not following up this year
        .subtract(notFollowingUpYet)
        // subtract the new cases
        .subtract(newCases)
    
    return sample
}

const deepCopyFollowup= (obj)=> {
    let cp = JSON.parse(JSON.stringify(obj))
    cp.return = cp.return.map( x => (x?.counts)?new Sample(x.counts):x);
    cp.treat= cp.treat?new Sample(cp.treat.counts):cp.treat;
    return cp
}

let initial_sample = new Sample(scenario.sample[0])
let y0_results = run_scenario(scenario.flow,initial_sample);
let y0_followup=get_actions(y0_results,0)
const y0_HPV_NEGATIVE=y0_results.results.HPV_NEGATIVE.counts.CIN_LT_2;
console.log("------ Finished Year 0")


let year_not_zero_scenario = JSON.parse(JSON.stringify(scenario))

// UPDATE THE PROBABLITY FOR THE HPV TEST....
year_not_zero_scenario.flow.probabilities = hpv_after_post_hpv_probabilities;

let y1_sample = getNextYearSample(year_not_zero_scenario,1,y0_followup,y0_HPV_NEGATIVE)
let y1_results = run_scenario(year_not_zero_scenario.flow,y1_sample)
let y1_followup=get_actions(y1_results,1,deepCopyFollowup(y0_followup))
console.log("------ Finished Year 1")

let dc=deepCopyFollowup(y1_followup);

let y2_sample = getNextYearSample(year_not_zero_scenario,2,y1_followup,y0_HPV_NEGATIVE)
let y2_results = run_scenario(year_not_zero_scenario.flow,y2_sample)
let y2_followup=get_actions(y2_results,2,deepCopyFollowup(y1_followup))
console.log(y2_sample)
console.log("------ Finished Year 2")

let y3_sample = getNextYearSample(year_not_zero_scenario,3,y2_followup,y0_HPV_NEGATIVE)
let y3_results = run_scenario(year_not_zero_scenario.flow,y3_sample)
let y3_followup=get_actions(y3_results,3,deepCopyFollowup(y2_followup))
console.log(y2_sample)
console.log("------ Finished Year 3")


console.log(" ================ YEAR 0 ================ ")
console.log(y0_results)
console.log("y0_followup: ",y0_followup)


console.log(" ================ YEAR 1 ================ ")
console.log(y1_sample)
console.log(y1_results)
console.log(y1_followup)

console.log(" ================ YEAR 2 ================ ")
console.log(y2_sample)
console.log(y2_results)
console.log(y2_followup)

console.log(" ================ YEAR 3 ================ ")
console.log(y3_sample)
console.log(y3_results)
console.log(y3_followup)


console.log("done")