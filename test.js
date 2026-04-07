import {Sample, Multisample} from './sample.js'

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
    runMultipleSamples(multisample,year,customParams={}){
        let probs = this.config.probabilities(year,customParams);
        let sample_array = multisample.samples;

        function _has_all_keys(key){
            let item=sample_array[key]
            if (!Sample.isSample(item)) return false;

            let prob_keys=Object.keys(probs)
            let sample_keys=Object.keys(item.counts )
            return sample_keys.every((k) => prob_keys.includes(k))
        }


        let full_samples=Object.keys(sample_array).filter( (key) => _has_all_keys(key))
        if (full_samples.length==0){
            throw new Error('NO SAMPLES are completely described by the test')
        }
        let sample_from_total = Object.keys(sample_array).filter( (key) => !full_samples.includes(key))

        // Run the case where we don't need the totals...
        console.log("Run: ",full_samples," then Run using totals: ",sample_from_total)
        let results = full_samples.reduce((acc,key) => {
            console.log(`.... running ${key} sample for year ${year}`)
            acc[key] = this.run(sample_array[key],year, customParams)
            return acc
        },{})

        // Run the cases where we need the total (for each output)
        // there may be more the 1 set of outcomes already run, so 
        // get the totals from the first set...
        let total = results[full_samples[0]];
        results = sample_from_total.reduce( (acc,key)=>{
            console.log(`.... still need to run ${key}.`)
            acc[key] = this.run_given_total(sample_array[key],total,year, customParams)
            return acc
        },results)

        results = Object.values(results)
        console.log(results)
        let ms_results = this.outcomes.reduce( (acc,outcome) => {
            let samples_for_this_outcome = results.map(r=>r[outcome])
            console.log(".........",samples_for_this_outcome,"...",outcome)
            acc[outcome] = Multisample.build_from_samples(samples_for_this_outcome,multisample.labels)
            console.log(".........",acc[outcome])
            return acc;
        },{})
        console.log("results: ",ms_results)
        console.log("bazinga!!")
        return ms_results
    }

    /**
     * Returns the test results for the sample as an Object where
     * the keys are the outcomes, and the values are samples for the outcome
     * 
     * @param {Sample} sample - the sample of people taking the test.
     * @param {number} year - the year - needs for time-dependent parameters
     * @returns {Object} The test results - a Sample for all outcomes
     */
    run(sample,year,customParams={}){
        if (Sample.isSample(sample)){
            return this.run_sample(sample,year,customParams)
        }
        if (Multisample.isMultisample(sample)){
            return this.runMultipleSamples(sample,year,customParams)
        }
        throw new Error("Tests require a sample or Multisample")

        return null
    }

    run_sample(sample,year,customParams={}){
        let probs = this.config.probabilities(year,customParams);

        // for each outcome create a sample
        return this.config.outcomes.reduce( (acc,outcome)=> {
            // for each sample label...
            let cntObj=sample.labels.reduce( (acc1,label) => {
                acc1[label]=sample.counts[label]*probs[label][outcome]
                return acc1
            },{})
            acc[outcome] = sample.newSampleFromTestResults(cntObj)
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
    run_given_total(sample,complete,year,customParams={}){
        let probs = this.config.probabilities(year,customParams);
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
