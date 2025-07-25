// This holds the test params for the HPV test 
// The HPV12 test is on DS TRIAGE OF HR12
// There are CIN2 and CIN3 parameters
// Sensitivity == P(test+|Disease+)
// Specificity == P(test-|Disease-)
// pHPV16 is the P(HPV16|CIN+)
// Note: CIN2+ + CIN<2 are ALL the people (CIN2+)+(CIN<2) = 100,000
// whereas CIN3+ is all by it's lonesome, we dont calc (CIN<3)
class Test {
    constructor(name,params){
        this.name=name
        this.params = params
    }
    static isTest(x){
        return  x instanceof Test;
    }

    res(sample,...parts){
        let x = Object.keys(sample)
            .filter(key => parts.includes(key))
            .reduce( (acc,key)=>{
                acc[key] = sample[key]
                return acc
            },{})
        console.log(x)
        return x
    }

    results2(sample){
        // for each output create a new sample...
        let res = Object.entries(this.params).reduce( (acc,[outcome,p])=>{
            acc[outcome]={};
            Object.entries(sample).forEach( ([status,value])=>{
                acc[outcome][status]=p[status] * value
            });
            return acc
        },{})
        return res;
    }

    results(sample) {
        let res = Object.entries(sample).reduce((acc, [s, value]) => {
            if (this.params[s]) {
                Object.entries(this.params[s]).forEach(([lbl, p]) => {
                    acc[`${s}_${lbl}`] = p * value
                })
            } else {
                acc[`${s}`] = value
            }
            return acc;
        }, {});

        return res
    }
}

class Colpo extends Test{
    constructor(){
        super("Colposcopy",{
            COLPO_NEGATIVE:{
                CIN_LT_2:1,
                CIN2:0,
                CIN3:0,
            },
            COLPO_POSITIVE:{
                CIN_LT_2:0,
                CIN2:1,
                CIN3:1,
            }
        })
    }
}



// This is a calculation that predicts
// Enrollment = Year 0, then year 1..3
new_incidence={
    total:{
        CIN2:[1115.93418277016,1390.45802887803,1653.98166519198,1851.76435721161],
        CIN3:[412.784688072246,495.759817283452,572.218742759672,638.811289673127]
    },
    incidence:{
        CIN2:[0,0.0009,0.0015,0.0022],
        CIN3:[0,0.0003,0.0005,0.0007]
    }
}




let param1 = {
    HR12:{
        CIN_LT_2: 0.0604201525976848,
        CIN2: 0.56944802837317,
        CIN3: 0.438982641950655,
    },
    HPV16: {
        CIN_LT_2:0.0082828141720536,
        CIN2:0.338358458450934,
        CIN3:0.464364750925894,
    },
    HPV18:{
        CIN_LT_2:0.0032970332302616,
        CIN2:0.0691935131758958,
        CIN3:0.0676526071234512,
    },
    HPV_NEGATIVE:{
        CIN_LT_2: 0.928,
        CIN2: 0.023,
        CIN3: 0.029
    }
}


function set_ds_neg(param){
    param.DS_NEGATIVE={}
    Object.keys(param.DS_POSITIVE).forEach( (k) => param.DS_NEGATIVE[k] = 1-param.DS_POSITIVE[k])
}

let ds_hr12={
    DS_POSITIVE:{
        CIN_LT_2: 0.41412406970499,
        CIN2: 0.823318170339884,
        CIN3: 0.898331496672872,
    }
}
set_ds_neg(ds_hr12)
let ds_hpv16 = {
    DS_POSITIVE:{
        CIN_LT_2: 0.570362383906779,         
        CIN2: 0.897455292505854,
        CIN3: 0.94859903291562
    }
}
set_ds_neg(ds_hpv16)
let ds_hpv18={
    DS_POSITIVE:{
        CIN_LT_2: 0.522737846482541,
        CIN2: 0.878355523488237,
        CIN3: 0.935899386791593
    }
}
set_ds_neg(ds_hpv18)


function print_table(smp) {
    // all samples have a CIN_LT_2, CIN2, CIN3...
    let prefix = ["CIN_LT_2", "CIN2", "CIN3"]
    // if you only have that add the _N suffix for the table.
    let local_sample = Object.keys(smp).reduce( (acc,current) => {
        let key = (prefix.includes(current))?current+"_N":current;
        acc[key] = smp[current]
        return acc
    },{});

    let suffix = Object.keys(local_sample).filter(k => k.startsWith("CIN2"))
        .map(k => k.slice(5))
    
    suffix.forEach((s) =>  {
        local_sample[`TOTAL_${s}`]=local_sample[`CIN_LT_2_${s}`] + local_sample[`CIN2_${s}`]
    });
    prefix.unshift('TOTAL')

    console.log(local_sample)
    let table = prefix.reduce( (row,p)=>{
        row[p]={};
        suffix.forEach( (s) => {
            row[p][s] = local_sample[`${p}_${s}`]
        })
        return row
    },{})
    
    let tbl2 = Object.entries(table).reduce( (acc,[rowkey,rowvalue]) => {
        acc[rowkey] = Object.entries(rowvalue).reduce( (col_acc,[itemkey,itemvalue]) => {
            col_acc[itemkey]=Math.round(itemvalue)
            return col_acc
        },{})
        return acc; 
    },{});
    console.table( tbl2 )
}

function next_year(sample,incidence,year){
    if (sample === undefined || incidence == undefined || 
        year == undefined) {
            throw new Error(`new_year requires all parameters: \n\tyear: ${year}\n\tincidence: ${JSON.stringify(incidence)}\n\tsample:${JSON.stringify(sample)}`)
    }
    console.log(incidence[year])
    print_table(sample)
}

let hpv_test = new Test("HPV_WITH_PARTIAL_GENOTYPING",param1)
let ds_hr12_test = new Test("DUAL_STAIN",ds_hr12)
coloposcopy=new Colpo();
let sc = {
    test: hpv_test,
    followup: {
        "HR12": {
            test: ds_hr12_test,
            followup: {
                "DS_POSITIVE": {
                    test: coloposcopy,
                    followup: {
                        "COLPO_NEGATIVE": {
                            year: 1
                        },
                        "COLPO_POSITIVE": {
                            treat: true
                        }
                    }
                },
                "DS_NEGATIVE": {
                    year: 1
                }
            }
        },
        "HPV16": {
            test: coloposcopy,
            followup: {
                "COLPO_NEGATIVE": {
                    year: 1
                },
                "COLPO_POSITIVE": {
                    treat: true
                }
            }
        },
        "HPV18": {
            test: coloposcopy,
            followup: {
                "COLPO_NEGATIVE": {
                    year: 1
                },
                "COLPO_POSITIVE": {
                    treat: true
                }
            }
        },
        "HPV_NEGATIVE":{
            year: 5
        }
    },

    // These add to the full N... needed for total Year 2..
    full_sample: ["CIN_LT_2","CIN2"],
    next_year_lost: "result.HPV_NEGATIVE"
}


function run_scenario(setup,sample){
    function run_test(sample,test,followup){
        let test_results = {
            test:test.name,
            result: test.results2(sample),
        }

        if (!followup) {
            return test_results
        }

        // the followup can have years only look at test...
        let followupTests=Object.entries(followup);
        if (followupTests.length>0){
            followupTests.forEach( ([branch,nxt]) => {
                if (nxt.test){
                    test_results.result[branch][nxt.test.name] = run_test(test_results.result[branch],nxt.test,nxt.followup)
                } else if (nxt.year){
                    test_results.result[branch].followup = nxt.year;
                } else if (nxt.treat){
                    test_results.result[branch].treat = true;
                }
            })
        }
        return test_results
    }
    return run_test(sample,setup.test,setup.followup)
    
}



function get_followup(results,year,acc={ followup:{},treat:{} }){
    function isTest(obj){ return Object.hasOwn(obj,"test")};

    let test_results=results.result;

    // get for each of my results... look for follow up test
    // and check if they need to be follow up next year.
    Object.entries(test_results).forEach(  ([key,results]) => {
        // A Test results has status (one of the results): {Disease status: count,... ,next test:{}, followup)}        
        if (results.followup){
            let years_to_followup = results.followup;
            Object.entries(results).forEach( ([status,count])=> {
                if (status!="followup") {
                    if (!Array.isArray(acc.followup[status])) {
                        acc.followup[status]=new Array();
                    }
                    acc.followup[status][years_to_followup+year]=(acc.followup[status][years_to_followup]??0)+count 
                }
            })
        } else if(results.treat){
            Object.entries(results).forEach( ([status,count])=> {
                if (status!="treat") {
                    acc.treat[status]=(acc.treat[status]??0)+count 
                }
            })
        } else {
            // Check if there is a follow up test...
            Object.values(results).filter( (v)=> isTest(v)).forEach((test)=>get_followup(test,year,acc))
        }
    })

    return acc;
}

function getComplexKey(obj,complexKey){
    const keys = complexKey.split('.')
    let current = obj;

    keys.forEach( (key) => {
        current = current[key]
        if (current === undefined || current === null){
            throw new Error(`Problem getting the complex key ${complexKey} @ ${key}`)
        }
    });

    return current
}

/*
   This function needs to be generalized if we are going to use it in many other 
   cases.

   It assumes... 
      1. CIN2 + CIN_LT_2 = Total...
      2. CIN2 = EXP CASES - TREAT - no followup this year - NEW case in CIN_LT_2
      3. we dont measure CIN_LT_3, just use total-CIN3
*/
function get_next_year_sample(year, previous_year_totals, hpv_neg_year_0) {
    // for year 0 the total is 100,000...
    let total = 100000;
    let sample = {
        CIN2: new_incidence.total.CIN2[year],
        CIN3: new_incidence.total.CIN3[year]
    }

    if (year > 0) {
        total = previous_year_totals.followup.CIN2[year] + previous_year_totals.followup.CIN_LT_2[year]

        Object.keys(sample).forEach((k) => {
            // remove the treated case...
            sample[k] -= previous_year_totals.treat[k];
            // remove all cases where the followup is later than this year
            sample[k] -= previous_year_totals.followup[k].slice(year + 1)
                .filter(x => Number.isFinite(x))
                .reduce((x, y) => x + y)
            // remove hpv- cases from YEAR 0 that grow into new cases
            sample[k] -= hpv_neg_year_0 * new_incidence.incidence[k][year]
        })
    }

    console.log(total)
    sample["CIN_LT_2"] = total - sample["CIN2"]
    return sample
}

let sample = {
    CIN_LT_2: 100000 - new_incidence.total.CIN2[0],
    CIN2: new_incidence.total.CIN2[0],
    CIN3: new_incidence.total.CIN3[0]
}
let sample_y0 = get_next_year_sample(0)
console.log(sample)
console.log(sample_y0)

let y0_results = run_scenario(sc,sample)
let y0_totals = get_followup(y0_results,0)
console.log(y0_results)

let sample_y1=get_next_year_sample(1,y0_totals,getComplexKey(y0_results,"result.HPV_NEGATIVE.CIN_LT_2"))
let y1_results = run_scenario(sc,sample_y1)
let y1_totals = get_followup(y1_results,1)
console.log(y1_results)

let sample_y2=get_next_year_sample(2,y1_totals,getComplexKey(y0_results,"result.HPV_NEGATIVE.CIN_LT_2"))
console.log(sample_y2)