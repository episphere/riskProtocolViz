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
    ["Extended_HPV_genotyping",{
        testName: "Extended_HPV_genotyping",
        outcomes: ["HPV_NEGATIVE","HPV_56_59_66","HPV_OTHER","HPV16","HPV18"],
        "probabilities": function (year,{
            CIN2 = {sensativity: 0.977, specificity:0.928, followup_specificity:0.575},
            CIN3 = {sensativity: 0.971} 
        } = {}) {
            if (year>0){
                return {
                    CIN_LT_2: {
                        "HPV_NEGATIVE": CIN2.followup_specificity, "HPV_56_59_66": 0.1806620936325 * (1 - CIN2.followup_specificity),
                        "HPV_OTHER": 0.6445308421957 * (1 - CIN2.followup_specificity), "HPV16": 0.1349356853562 * (1 - CIN2.followup_specificity),
                        "HPV18": 0.0398713788156 * (1 - CIN2.followup_specificity)
                    },
                    CIN2: {
                        "HPV_NEGATIVE": 1 - CIN2.sensativity, "HPV_56_59_66": 0.044192812 * CIN2.sensativity,
                        "HPV_OTHER": 0.5407587698322 * CIN2.sensativity, "HPV16": 0.3443049813002 * CIN2.sensativity,
                        "HPV18": 0.0707434371307 * CIN2.sensativity
                    },
                    CIN3: {
                        "HPV_NEGATIVE": 1 - CIN3.sensativity, "HPV_56_59_66": 0.0231557970530 * CIN3.sensativity,
                        "HPV_OTHER": 0.4118072214929 * CIN3.sensativity, "HPV16": 0.5020244012067 * CIN3.sensativity,
                        "HPV18": 0.0630125802475 * CIN3.sensativity
                    }
                }
            }
            return {
                CIN_LT_2: {
                    "HPV_NEGATIVE": CIN2.specificity, "HPV_56_59_66":0.1806620936325*(1-CIN2.specificity),
                    "HPV_OTHER":0.6445308421957*(1-CIN2.specificity), "HPV16":0.1349356853562*(1-CIN2.specificity),
                    "HPV18":0.0398713788156*(1-CIN2.specificity)
                },
                CIN2:{
                    "HPV_NEGATIVE": 1-CIN2.sensativity, "HPV_56_59_66":0.044192812*CIN2.sensativity,
                    "HPV_OTHER":0.5407587698322*CIN2.sensativity, "HPV16":0.3443049813002*CIN2.sensativity,
                    "HPV18":0.0707434371307*CIN2.sensativity
                },
                CIN3:{
                    "HPV_NEGATIVE": 1-CIN3.sensativity, "HPV_56_59_66":0.0231557970530*CIN3.sensativity,
                    "HPV_OTHER":0.4118072214929*CIN3.sensativity, "HPV16":0.5020244012067*CIN3.sensativity,
                    "HPV18":0.0630125802475*CIN3.sensativity
                }
            }
        }
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
    ["Dual_Stain_HPV_56_59_66",{
        "testName": "Dual_Stain_HPV_56_59_66",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            // p={specificity,sensativity,sensativity...}
            let p={CIN_LT_2:0.6890619426856,CIN2:0.7559744499724,CIN3:0.8836111920322}
            return {
                "CIN_LT_2": { "DS_POSITIVE": 1-p.CIN_LT_2, "DS_NEGATIVE": p.CIN_LT_2 },
                "CIN2": { "DS_POSITIVE":p.CIN2, "DS_NEGATIVE": 1-p.CIN2 },
                "CIN3": { "DS_POSITIVE": p.CIN3, "DS_NEGATIVE": 1-p.CIN3 },
            }
        }
    }],
    ["Dual_Stain_HPV_OTHER",{
        "testName": "Dual_Stain_HPV_OTHER",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            let p={CIN_LT_2:0.5431535125775,CIN2:0.8523845916894,CIN3:0.9389332324373}
            return {
                "CIN_LT_2": { "DS_POSITIVE": 1-p.CIN_LT_2, "DS_NEGATIVE": p.CIN_LT_2 },
                "CIN2": { "DS_POSITIVE":p.CIN2, "DS_NEGATIVE": 1-p.CIN2 },
                "CIN3": { "DS_POSITIVE": p.CIN3, "DS_NEGATIVE": 1-p.CIN3 },
            }
        }
    }],
    ["Dual_Stain_HPV16",{
        "testName": "Dual_Stain_HPV16",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            let p={CIN_LT_2:0.4221706285164,CIN2:0.9038141200100,CIN3:0.9637008861184}
            return {
                "CIN_LT_2": { "DS_POSITIVE": 1-p.CIN_LT_2, "DS_NEGATIVE": p.CIN_LT_2 },
                "CIN2": { "DS_POSITIVE":p.CIN2, "DS_NEGATIVE": 1-p.CIN2 },
                "CIN3": { "DS_POSITIVE": p.CIN3, "DS_NEGATIVE": 1-p.CIN3 },
            }
        }
    }],
    ["Dual_Stain_HPV18",{
        "testName": "Dual_Stain_HPV18",
        "outcomes": ["DS_POSITIVE", "DS_NEGATIVE"],
        "probabilities": function (year) {
            let p={CIN_LT_2:0.4363003418997,CIN2:0.8986817869870,CIN3:0.9626163343471}
            return {
                "CIN_LT_2": { "DS_POSITIVE": 1-p.CIN_LT_2, "DS_NEGATIVE": p.CIN_LT_2 },
                "CIN2": { "DS_POSITIVE":p.CIN2, "DS_NEGATIVE": 1-p.CIN2 },
                "CIN3": { "DS_POSITIVE": p.CIN3, "DS_NEGATIVE": 1-p.CIN3 },
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
    }],
    ["S1_Past_NILM", {
        "test": "S1_Past_NILM",
        "outcomes": ["NILM_X2", "LOW_GRADE", "HIGH_GRADE"],
        "probabilities": function (year) {
            return {
                "CIN_LT_2": {NILM_X2:0.539799050225538,LOW_GRADE:0.437338335573422,HIGH_GRADE:0.0228626142010395},
                "CIN2": {NILM_X2:0.649459455770501,LOW_GRADE:0.32180516825407,HIGH_GRADE:0.0287353759754292},
                "CIN3": {NILM_X2:0.690995485894883,LOW_GRADE:0.272619762043229,HIGH_GRADE:0.0363847520618882}
            }
        }
    }],
    ["S1_Past_ASC_US+",{
        "test": "S1_Past_ASC_US+",
        "outcomes":["LOW_GRADE","OTHER"],
        "probabilities":function(year){
            return {
                "CIN_LT_2":{LOW_GRADE:0.618356426615888,OTHER:0.381643573384112},
                "CIN2":{LOW_GRADE:0.521798908037213,OTHER:0.478201091962787},
                "CIN3":{LOW_GRADE:0.47177338006069,OTHER:0.52822661993931}
            }
        }
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
    scenario1_y0:{
        scenarioName: "Primary HPV screening triaged with Cytology",
        test: "Primary_HPV",
        followup: {
            "HPV_NEGATIVE": hpv_neg_followup,
            "HPV_POSITIVE": cytology
        }
    },
    scenario1:{
        scenarioName: "Primary HPV screening triaged with Cytology",
        test: "Primary_HPV",
        followup: {
            "HPV_NEGATIVE": hpv_neg_followup,
            "HPV_POSITIVE": {
                test:"Cytology",
                followup:{
                    NILM:{
                        test: "S1_Past_NILM",
                        followup:{
                            NILM_X2:colpo,
                            LOW_GRADE: one_year_followup,
                            HIGH_GRADE: colpo,
                        }
                    },
                    ASC_US:{
                        test:"S1_Past_ASC_US+",
                        followup:{
                            "LOW_GRADE":one_year_followup,
                            "OTHER":colpo
                        }
                    },
                    LSIL:{
                        test:"S1_Past_ASC_US+",
                        followup:{
                            "LOW_GRADE":one_year_followup,
                            OTHER:colpo
                        }
                    },
                    HIGH_GRADE: colpo
                }
            }
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
    scenario5:{
        scenarioName: "Primary HPV screening with extended genotyping triaged with Cytology",
        test: "Extended_HPV_genotyping",
        followup: {
            "HPV_56_59_66": one_year_followup,
            "HPV_OTHER": cytology,
            "HPV16": colpo,
            "HPV18": colpo,
            "HPV_NEGATIVE": hpv_neg_followup
        }
    },
    scenario6:{
        scenarioName: "Primary HPV screening with extended genotyping triaged with Dual Stain",
        test: "Extended_HPV_genotyping",
        followup: {
            "HPV_56_59_66": one_year_followup,
            "HPV_OTHER":  {
                test: "Dual_Stain_HPV_OTHER",
                followup: {
                    "DS_POSITIVE": colpo,
                    "DS_NEGATIVE": one_year_followup
                }
            },
            "HPV16": colpo,
            "HPV18": colpo,
            "HPV_NEGATIVE": hpv_neg_followup
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