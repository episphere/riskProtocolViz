export const testMap = new Map([
    ["Primary_HPV",{
        "testName": "Primary_HPV",
        "outcomes":["HPV_NEGATIVE","HPV_POSITIVE"],
        "probabilities": function (year,{
            CIN2 = {sensativity: 0.9766945700, specificity:0.9283468213, followup_specificity:0.575},
            CIN3 = {sensativity: 0.9709464567} 
        } = {}) {
            if (year == 0){
                return {
                    CIN_LT_2: {"HPV_NEGATIVE":CIN2.specificity,"HPV_POSITIVE":1-CIN2.specificity},
                    CIN2: {"HPV_NEGATIVE":1-CIN2.sensativity,"HPV_POSITIVE":CIN2.sensativity},
                    CIN3: {"HPV_NEGATIVE":1-CIN3.sensativity,"HPV_POSITIVE":CIN3.sensativity},    
                }
            } 
            return {
                CIN_LT_2: {"HPV_NEGATIVE":CIN2.followup_specificity,"HPV_POSITIVE":1-CIN2.followup_specificity},
                CIN2: {"HPV_NEGATIVE":1-CIN2.sensativity,"HPV_POSITIVE":CIN2.sensativity},
                CIN3: {"HPV_NEGATIVE":1-CIN3.sensativity,"HPV_POSITIVE":CIN3.sensativity},
            }     
        }
    }],
    ["HPV_Partial_genotyping", {
        "testName": "HPV_Partial_genotyping",
        "outcomes": ["HR12", "HPV16", "HPV18", "HPV_NEGATIVE"],
        "probabilities": function (year) {
            if (year == 0) {
                return {
                    "CIN_LT_2": { "HR12": 0.0604201525976848, "HPV16": 0.0082828141720536, "HPV18": 0.0032970332302616, "HPV_NEGATIVE": 0.928 },
                    "CIN2": { "HR12": 0.56944802837317, "HPV16": 0.338358458450934, "HPV18": 0.0691935131758958, "HPV_NEGATIVE": 0.023 },
                    "CIN3": { "HR12": 0.438982641950655, "HPV16": 0.464364750925894, "HPV18": 0.067652607, "HPV_NEGATIVE": 0.029 },
                }
            }

            return {
                "CIN_LT_2": { "HR12": 0.356646734083556, "HPV16": 0.0488916114322609000000, "HPV18": 0.0194616544841831000000, "HPV_NEGATIVE": 0.575 },
                "CIN2": { "HR12": 0.56944802837317, "HPV16": 0.338358458450934, "HPV18": 0.0691935131758958, "HPV_NEGATIVE": 0.023 },
                "CIN3": { "HR12": 0.438982641950655, "HPV16": 0.464364750925894, "HPV18": 0.067652607, "HPV_NEGATIVE": 0.029 },
            }
        },
    }],
    ["HPV_COTEST", {
        "testName": "HPV_COTEST",
        "outcomes": [
            "HPV_POSITIVE_NILM", "HPV_POSITIVE_ASC_US", "HPV_POSITIVE_LSIL", "HPV_POSITIVE_HIGH_GRADE",
            "HPV_NEGATIVE_NILM", "HPV_NEGATIVE_ASC_US", "HPV_NEGATIVE_LSIL", "HPV_NEGATIVE_HIGH_GRADE"],
        probabilities: function (year,{ HPV_Sensativity = 0.977, HPV_Specificity = 0.928, Cytology_Sensativity = 0.834, Cytology_Specificity=0.458} = {}) {
            return {
                CIN_LT_2: {
                    "HPV_POSITIVE_NILM": Cytology_Specificity, "HPV_POSITIVE_ASC_US": 0.527184104144338*(1-Cytology_Specificity),
                    "HPV_POSITIVE_LSIL": 0.411915221158243*(1-Cytology_Specificity), "HPV_POSITIVE_HIGH_GRADE": 0.060900674697419*(1-Cytology_Specificity),
                    "HPV_NEGATIVE_NILM": 0.97779238537, "HPV_NEGATIVE_ASC_US": 0.01783025430,
                    "HPV_NEGATIVE_LSIL": 0.00224985093, "HPV_NEGATIVE_HIGH_GRADE": 0.00212750940
                },
                CIN2: {
                    "HPV_POSITIVE_NILM": 1-Cytology_Sensativity, "HPV_POSITIVE_ASC_US": Cytology_Sensativity*0.3121406831246,
                    "HPV_POSITIVE_LSIL": Cytology_Sensativity*0.2799586048487, "HPV_POSITIVE_HIGH_GRADE": Cytology_Sensativity*0.4079007120267,
                    "HPV_NEGATIVE_NILM": 0.000, "HPV_NEGATIVE_ASC_US": 0.05033444970,
                    "HPV_NEGATIVE_LSIL": 0.30070034214, "HPV_NEGATIVE_HIGH_GRADE": 0.64896520816,
                }
            }
        }

    }],
    ["Cytology",{
        "testName":"Cytology",
        "outcomes":["NILM","ASC_US","LSIL","HIGH_GRADE"],
        "probabilities": function (year,{
            CIN2= {sensativity: 0.834, specificity:0.458},
            CIN3= {sensativity: 0.828},
        } = {}) {
            return {
                CIN_LT_2: {"NILM":CIN2.specificity,"ASC_US":(1-CIN2.specificity)*0.527184104,"LSIL":(1-CIN2.specificity)*0.411915221,"HIGH_GRADE":(1-CIN2.specificity)*0.060900675},
                CIN2: {"NILM":1-CIN2.sensativity,"ASC_US":CIN2.sensativity*0.312140683124584,"LSIL":CIN2.sensativity*0.279958604848683,"HIGH_GRADE":CIN2.sensativity*0.407900712026733},
                CIN3: {"NILM":1-CIN3.sensativity,"ASC_US":CIN3.sensativity*0.261744875432922,"LSIL":CIN3.sensativity*0.151306847836982,"HIGH_GRADE":CIN3.sensativity*0.586948276730096}
            }
        }
    }],
    ["Dual_Stain_HPV+",{
        "testName": "Dual_Stain_HPV+",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            return {
                "CIN_LT_2": { "DS_POSITIVE": 0.43865125190319, "DS_NEGATIVE": 0.56134874809681 },
                "CIN2": { "DS_POSITIVE": 0.85835492733066, "DS_NEGATIVE": 0.14164507266934 },
                "CIN3": { "DS_POSITIVE": 0.92445282221260, "DS_NEGATIVE": 0.07554717778740 },
            }
        }
    }],
    ["Dual_Stain_HR12", {
        "testName": "Dual_Stain_HR12",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            return {
                "CIN_LT_2": { "DS_POSITIVE": 0.414124069704990, "DS_NEGATIVE": 0.58587593029501 },
                "CIN2": { "DS_POSITIVE": 0.823318170339884, "DS_NEGATIVE": 0.176681829660116 },
                "CIN3": { "DS_POSITIVE": 0.898331496672872, "DS_NEGATIVE": 0.101668503327128 },
            }
        }
    }],
    ["Colposcopy", {
        "testName": "Colposcopy",
        "outcomes": ["COLPO_POSITIVE", "COLPO_NEGATIVE"],
        "probabilities": function (year) {
            return {
                "CIN_LT_2": { "COLPO_NEGATIVE": 1.0, "COLPO_POSITIVE": 0.0 },
                "CIN2": { "COLPO_NEGATIVE": 0.0, "COLPO_POSITIVE": 1.0 },
                "CIN3": { "COLPO_NEGATIVE": 0.0, "COLPO_POSITIVE": 1.0 }
            }
        },
    }]
])

// some standard followups...
const colpo = {
    test: "Colposcopy",
    followup: {
        "COLPO_POSITIVE": {
            test: false,
            action: "treat"
        },
        "COLPO_NEGATIVE": {
            test: false,
            action: "followup",
            years: () => 1
        }
    }
}
const hpv_neg_followup = {
    test: false,
    action: "followup",
    years: (year) => year == 0 ? 5 : 1
}
const one_year_followup = {
    test: false,
    action: "followup",
    years: () => 1
}
const cytology = {
    test: "Cytology",
    followup: {
        "NILM": one_year_followup,
        "ASC_US": colpo,
        "LSIL": colpo,
        "HIGH_GRADE": colpo

    }
}

export const newScenarios = {
    scenario1:{
        scenarioName: "Primary HPV screening with Cytology",
        test: "Primary_HPV",
        followup: {
            "HPV_NEGATIVE": hpv_neg_followup,
            "HPV_POSITIVE": cytology,
        }
    },
    scenario2:{
        scenarioName: "Primary HPV screening triaged with Dual-Stain",
        test: "Primary_HPV",
        followup: {
            HPV_NEGATIVE: hpv_neg_followup,
            HPV_POSITIVE: {
                test: "Dual_Stain_HPV+",
                followup: {
                    DS_NEGATIVE: one_year_followup,
                    DS_POSITIVE: colpo
                }  
            }
        }
    },
    scenario3:{
        scenarioName: "Primary HPV screening with partial Genotyping triaged with Cytology",
        test: "HPV_Partial_genotyping",
        followup: {
            HPV_NEGATIVE: hpv_neg_followup,
            HR12 : cytology,
            HPV16: colpo,
            HPV18: colpo
        }
    },
    scenario4: {
        scenarioName: "Primary HPV screening with partial genotype triaged with Dual-Stain",
        test: "HPV_Partial_genotyping",
        followup: {
            "HR12": {
                test: "Dual_Stain_HR12",
                followup: {
                    "DS_POSITIVE": colpo,
                    "DS_NEGATIVE": one_year_followup
                }
            },
            "HPV16": colpo,
            "HPV18": colpo,
            "HPV_NEGATIVE": hpv_neg_followup
        }
    },
    scenario7:{
        scenarioName: "Screening with cotesting",
        test: "HPVCotest",
        followup: {
            "HPV_POSITIVE_NILM":{

            },
            "HPV_POSITIVE_AS_US":{},
            "HPV_POSITIVE_LSIL":{},
            "HPV_POSITIVE_HIGH_GRADE":{},
            "HPV_NEGATIVE_NILM":{},
            "HPV_NEGATIVE_AS_US":{},
            "HPV_NEGATIVE_LSIL":{},
            "HPV_NEGATIVE_HIGH_GRADE":{}
        }
    }
}

export function isTest(obj) {
    return (Object.hasOwn(obj, "test") && !!obj.test)
}

export const counts = {
    CIN2:{
        expected:[1115.93418277016,1390.45802887803,1653.98166519198,1851.76435721161],
        incident_risk:[0,0.0009,0.0015,0.0022]
    },
    CIN3:{
        expected:[412.784688072246,495.759817283452,572.218742759672,638.811289673127],
        incident_risk:[0,0.0003,0.0005,0.0007]
    },
    initial_enrollment:100000
}