/**
 * @typedef {object} GroupCounts - An Object containing all the Mutually exclusive categories as keys and their counts as values
 * @property {number} [key:string] - The category label and it's value
 * 
 * @typedef {object} PartialGroupCount - An Object representing the items that are not mutually exclusive from the rest of the categories.
 * @property {GroupCounts} values - a partial sample missing one of the categories.
 * @property {string} missingLabel - the category label that is missing from the values
 */
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
        let total = Sample.getTotalCount(counts)
        return new Sample(counts, total)
    }

    static fromLabelTotal(total, knownCounts, otherLabel) {
        let knownTotal = Sample.getTotalCount(knownCounts);
        let otherCount = total - knownTotal;
        if (otherCount < 0) throw new Error(`Cannot create a sample with counts less than 0:\n total:${total} total of known counts:${knownTotal}\n${otherLabel}: ${otherCount}`);

        knownCounts[otherLabel] = otherCount;
        return new Sample(knownCounts, total)
    }    

    get labels() {
        return Object.keys(this.counts)
    }

    static getTotalCount(counts) {
        return Object.values(counts).reduce((acc, v) => {
            if (v < 0) throw new Error(`Sample with ${v}<0 counts`);
            if (!Number.isFinite(v)) throw new Error(`Sample with Bad count: ${v}`);
            return acc + v
        })
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

    scale(factor) {
        let cnts = this.labels.reduce((acc, key) => {
            acc[key] = factor * this.counts[key];
            return acc;
        }, {})
        return Sample.fromObject(cnts);
    }

    static isSample(obj) {
        return obj instanceof Sample
    }

    sameLabels(other) {
        otherLabels = other.labels
        this.labels.every((lbl, indx) => lbl == otherLabels[indx])
    }

    newSampleFromTestResults(test_result){
        console.log("called Sample.newSampleFromTestResults")
        return Sample.fromObject(test_result)
    }
}



export class Multisample {

    /**
     * 
     * @param {GroupCounts} full_obj a pojo that contains all the Groups(keys) and counts(value) 
     * @param  {...PartialGroupCount} [partCounts] rest parameter that contains all the other groups that 
     *  are not mutally exclusive from the first group and need to be tracked separately.  The total
     *  is the same as the first sample.
     *  Example: Multisample.build( {"a":10,"not_a":5},{values:{"c":10},"missingLabel":"not_c")  
     */
    static build(full_obj, ...partCounts) {
        let full_sample = Sample.fromObject(full_obj)
        let labels_of_interest = [...Object.keys(full_obj), ...partCounts.map((s) => Object.keys(s.values)).flat()];

        // map each label to the sample array
        let label_to_sample = Object.keys(full_obj).reduce((acc, k) => {
            acc[k] = 0
            return acc
        }, {})
        label_to_sample = partCounts.reduce((acc, partialSample, index) => {
            Object.keys(partialSample.values).forEach((k) => acc[k] = index + 1);
            return acc
        }, label_to_sample)

        // This modifies partCounts CALL IT LAST!
        let other_samples = partCounts.map((s) => Sample.fromLabelTotal(full_sample.total, s.values, s.missingLabel))

        let x = new Multisample();
        x.samples = [full_sample, ...other_samples]
        x.total = full_sample.total
        x.labels = labels_of_interest
        x.labelMap = label_to_sample;
        x.counts = x.buildCountArray();
        return x
    }

    static build_from_samples(samples_array,labels_of_interest){
        // Assert that all the labels of interest are in the sample array
        // and rebuild the label map.
        let labelMap = labels_of_interest.reduce( (acc,label) =>{
            for (let [index,sample] of samples_array.entries()){
                if (Object.hasOwn(sample.counts,label)) {
                    acc[label]=index
                    break;
                }
            }
            return acc
        },{})

        let x=new Multisample()
        x.samples=samples_array
        x.total=samples_array[0].total
        x.labels=labels_of_interest;
        x.labelMap=labelMap
        x.counts = x.buildCountArray();
        return x
    }

    static build_from_counts(labelMap,cntObj){
        
    }

    buildCountArray(){
        return this.labels.reduce( (acc,label)=>{
            let sampleIndex=this.labelMap[label]
            acc[label]=this.samples[sampleIndex].counts[label]
            return acc;
        },{})
    }

    add(otherMultiSample) {
        if (!(otherMultiSample instanceof Multisample)) return this;

        // add each sample...
        if (this.samples.length != otherMultiSample.samples.length) {
            throw new Error(`Adding multisamples with different lengths: ${this.samples.length()} != ${otherMultiSample.samples.length}`)
        }

        let samples = this.samples.map((s1, indx) => {
            let s2 = otherMultiSample.samples[indx];
            let s2labels = s2.labels
            // check that the keys for the sample are the same (e.g. dont add CIN2 and CIN3)
            if (!s1.labels.every((val, i) => val == s2labels[i])) {
                throw new Error(`Sample ${indx} of the Multisamples you are adding have different keys: `, s1.labels(), s2.labels())
            }
            return s1.add(s2)
        })

        let x = new Multisample();
        x.samples = samples
        x.total = samples[0].total
        x.labels = this.labels;
        x.labelMap = this.labelMap;
        x.counts = x.buildCountArray();
        return x
    }


    newSampleFromTestResults(test_result){
        console.log("called Multisample.newSampleFromTestResults",test_result)
        
        let test_result_count_objects=this.samples.map( (sample,indx)=>{
            // create a count object...
            return Object.keys(sample.counts).reduce((acc,category)=>{
                if (Object.hasOwn(test_result,category)) {
                    acc[category]=test_result[category]
                }
                return acc
            },{})
        } )

        // the full object is the Samples[0]
        let full_obj = test_result_count_objects.shift()
        // now create an object {values:{},missingLabel:""} for the rest...
        let partial_objs = test_result_count_objects.map( (cObj,indx) =>{
            let newObj={values:cObj}
            let missingLabel = this.samples[indx+1].labels.filter(key=>!Object.hasOwn(cObj,key))
            if (missingLabel.length!=1) {
                throw new Error("Trouble create a Multisample from the test results")
            }
            newObj.missingLabel = missingLabel[0]
            return newObj;
        })
        return Multisample.build(full_obj,...partial_objs)
    }
    static isMultisample(obj) {
        return obj instanceof Multisample
    }
}
