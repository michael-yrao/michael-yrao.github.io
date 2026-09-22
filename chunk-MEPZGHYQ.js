import{a as y,b as x}from"./chunk-OSQMNGTH.js";var Fa=`from typing import List


class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # for each number, the complement we need is target - number
        # if that complement is already in the map, we found our pair
        # otherwise store this number's index so a future number can find it

        map = {}

        for index, number in enumerate(nums):
            diff = target - number
            if diff in map:
                return [map[diff], index]
            # complement not found yet \u2014 store index for future lookups
            map[number] = index

        return`;function Da(){let i=[2,7,11,15],u=9,r=[],s=()=>i.map(t=>({value:t,state:"default"}));r.push({explanation:"We need to find two indices where nums[i] + nums[j] = 9. A brute-force nested loop would be O(n\xB2). Instead, we use a hash map so each lookup is O(1) \u2014 one pass, O(n) total.",highlightLine:13,state:{type:"array",cells:s(),pointers:[],hashmap:{}},variables:[{name:"target",value:u},{name:"map",value:"{}"}]});let n={};for(let t=0;t<i.length;t++){let a=i[t],e=u-a,o=s().map((l,h)=>x(y({},l),{state:h===t?"active":h<t?"visited":"default"}));if(r.push({explanation:`Index ${t}, value ${a}. Complement = ${u} \u2212 ${a} = ${e}. Is ${e} already in our map? ${e in n?`YES \u2014 at index ${n[e]}!`:"No \u2014 not yet."}`,highlightLine:16,state:{type:"array",cells:o,pointers:[{index:t,label:"i"}],hashmap:y({},n)},variables:[{name:"index",value:t,highlight:!0},{name:"number",value:a},{name:"diff",value:e,highlight:!0},{name:"diff in map",value:e in n?`yes \u2192 idx ${n[e]}`:"no"}]}),e in n){let l=s().map((h,d)=>x(y({},h),{state:d===n[e]||d===t?"found":"visited"}));r.push({explanation:`Found it! map[${e}] = ${n[e]}. We return [${n[e]}, ${t}]. The hash map made this O(1) lookup \u2014 no second scan needed.`,highlightLine:15,state:{type:"array",cells:l,pointers:[{index:n[e],label:"j"},{index:t,label:"i"}],hashmap:y({},n)},variables:[{name:"index",value:t},{name:"number",value:a},{name:"diff",value:e},{name:"result",value:`[${n[e]}, ${t}]`,highlight:!0}]});break}n[a]=t,r.push({explanation:`${e} wasn't in the map. We store {${a}: ${t}} \u2014 "value ${a} is at index ${t}." Next time we need ${a} as someone's complement, we know exactly where it is.`,highlightLine:17,state:{type:"array",cells:o,pointers:[{index:t,label:"i"}],hashmap:y({},n)},variables:[{name:"index",value:t},{name:"number",value:a,highlight:!0},{name:"diff",value:e},{name:"map[number]",value:t,highlight:!0}]})}return r}var Ba={label:"Hash Map",pythonCode:Fa,generateSteps:Da},Ce={id:"two-sum",lcNumber:1,title:"Two Sum",difficulty:"Easy",category:"arrays-hash",tags:["Hash Map","Array"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order.",examples:[{input:"nums = [2, 7, 11, 15],  target = 9",output:"[0, 1]",explanation:"nums[0] + nums[1] = 2 + 7 = 9"},{input:"nums = [3, 2, 4],  target = 6",output:"[1, 2]"}],constraints:["2 \u2264 nums.length \u2264 10\u2074","-10\u2079 \u2264 nums[i] \u2264 10\u2079","-10\u2079 \u2264 target \u2264 10\u2079","Only one valid answer exists."],hint:`For each number, ask: "what value would I need to add to this to reach the target?" Can you store that information so you don't have to scan the array a second time?`,solutions:[Ba]};var Ha=`class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        # a set gives O(1) membership checks \u2014 add each value and return True
        # the moment we try to add something already present
        numsSet = set()

        for integer in nums:
            if integer in numsSet:
                return True
            else:
                numsSet.add(integer)

        return False`;function _a(){let i=[1,2,3,1],u=[],r=new Set;u.push({explanation:`We initialize an empty set. A set gives us O(1) membership checks \u2014 much faster than scanning the array each time. We'll walk through nums and ask "have I seen this before?"`,highlightLine:9,state:{type:"array",cells:i.map(s=>({value:s,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"numsSet",value:"{}"}]});for(let s=0;s<i.length;s++){let n=i[s],t=r.has(n),a=i.map((e,o)=>({value:e,state:o===s?t?"found":"active":o<s?"visited":"default"}));if(t){u.push({explanation:`Index ${s}, value ${n}. Is ${n} in our set? YES! We've seen it before. Return true \u2014 duplicate found. The set caught this in O(1).`,highlightLine:9,state:{type:"array",cells:a,pointers:[{index:s,label:"i"}],hashmap:Object.fromEntries([...r].map(e=>[e,"\u2713"]))},variables:[{name:"integer",value:n,highlight:!0},{name:"integer in numsSet",value:"yes",highlight:!0},{name:"result",value:"true",highlight:!0}]});break}u.push({explanation:`Index ${s}, value ${n}. Not in the set yet \u2014 no duplicate so far. Add ${n} to the set so we can detect it if it appears again.`,highlightLine:11,state:{type:"array",cells:a,pointers:[{index:s,label:"i"}],hashmap:Object.fromEntries([...r].map(e=>[e,"\u2713"]))},variables:[{name:"integer",value:n,highlight:!0},{name:"integer in numsSet",value:"no"},{name:"numsSet",value:r.size+1}]}),r.add(n)}return u}var Wa=`class Solution:
    def containsDuplicateAlternative(self, nums: List[int]) -> bool:
        # since we only care about if it contains duplicates
        # we can check if when we convert this list to a set
        # whether or not the lengths are equal
        # this solution is still O(n) in both space and time
        # since python is still creating the set

        # returns true if len of the set is shorter than the length of the original list
        return len(set(nums)) < len(nums)`;function za(){let i=[1,2,3,1],u=[],r=new Set;u.push({explanation:"Different idea: a set automatically discards duplicates. So if we drop the whole array into a set and it comes out SHORTER than the array, at least one value collapsed \u2014 meaning there was a duplicate. We'll build set(nums) one element at a time to watch it happen, then compare the two lengths.",highlightLine:10,state:{type:"array",cells:i.map(n=>({value:n,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"len(nums)",value:i.length},{name:"set(nums)",value:"{}"}]});for(let n=0;n<i.length;n++){let t=i[n],a=r.has(t);a||r.add(t);let e=i.map((o,l)=>({value:o,state:l===n?a?"found":"active":l<n?"visited":"default"}));u.push({explanation:a?`set(nums) construction, index ${n}: value ${t} is ALREADY in the set, so adding it changes nothing \u2014 the set stays size ${r.size}. This is the duplicate being silently dropped.`:`set(nums) construction, index ${n}: value ${t} is new, add it. Set grows to size ${r.size}.`,highlightLine:10,state:{type:"array",cells:e,pointers:[{index:n,label:"i"}],hashmap:Object.fromEntries([...r].map(o=>[o,"\u2713"]))},variables:[{name:"value",value:t,highlight:!0},{name:"already in set?",value:a?"yes (dropped)":"no (added)",highlight:a},{name:"set size",value:r.size}]})}let s=r.size<i.length;return u.push({explanation:`Set built. len(set(nums)) = ${r.size}, len(nums) = ${i.length}. Is ${r.size} < ${i.length}? ${s?"Yes \u2192 the set is shorter, so a duplicate was dropped. Return True.":"No \u2192 same length, every value was unique. Return False."}`,highlightLine:10,state:{type:"array",cells:i.map(n=>({value:n,state:s?"found":"visited"})),pointers:[],hashmap:Object.fromEntries([...r].map(n=>[n,"\u2713"]))},variables:[{name:"len(set(nums))",value:r.size},{name:"len(nums)",value:i.length},{name:"result",value:String(s),highlight:!0}]}),u}var Me={id:"contains-duplicate",lcNumber:217,title:"Contains Duplicate",difficulty:"Easy",category:"arrays-hash",tags:["Hash Set","Array"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an integer array nums, return true if any value appears at least twice in the array, and false if every element is distinct.",examples:[{input:"nums = [1, 2, 3, 1]",output:"true",explanation:"1 appears at index 0 and index 3"},{input:"nums = [1, 2, 3, 4]",output:"false",explanation:"All values are distinct"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","-10\u2079 \u2264 nums[i] \u2264 10\u2079"],hint:"You need to know if you've seen a value before. What data structure lets you check membership in O(1)?",solutions:[{label:"Set Iteration",pythonCode:Ha,generateSteps:_a},{label:"Length Check",pythonCode:Wa,generateSteps:za}]};var Ya=`class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # anagrams are same length
        # anagrams are the same if sorted
        # anagrams also have the same # of each char, so hashmap
        sMap, tMap = {}, {}

        if len(s) != len(t):
            return False

        for i in range(len(s)):
            sMap[s[i]] = 1 + sMap.get(s[i],0)
            tMap[t[i]] = 1 + tMap.get(t[i],0)

        return sMap == tMap`,Ga=`class Solution:
    def isAnagramPython(self, s: str, t: str) -> bool:
        # anagrams are the same if sorted
        return ''.join(sorted(s)) == ''.join(sorted(t))`;function Va(){let i="anagram",u="nagaram",r=[],s={},n={},t=i.split(""),a=u.split(""),e=l=>t.map((h,d)=>({value:h,state:d<l?"visited":d===l?"active":"default"}));r.push({explanation:`Both strings are length ${i.length} \u2014 lengths match. Create two frequency maps: sMap for "${i}", tMap for "${u}". One pass builds both simultaneously.`,highlightLine:9,state:{type:"array",cells:t.map(l=>({value:l,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"s",value:i},{name:"t",value:u},{name:"sMap",value:"{}"},{name:"tMap",value:"{}"}]});for(let l=0;l<i.length;l++)s[i[l]]=(s[i[l]]??0)+1,n[u[l]]=(n[u[l]]??0)+1,r.push({explanation:`i=${l}: sMap['${i[l]}'] \u2192 ${s[i[l]]}; tMap['${u[l]}'] \u2192 ${n[u[l]]}. Each char's frequency grows.`,highlightLine:i[l]===u[l]?12:13,state:{type:"array",cells:e(l),pointers:[{index:l,label:"i"}],hashmap:y({},s),counters:Object.entries(n).map(([h,d])=>({label:`t['${h}']`,value:d}))},variables:[{name:"i",value:l,highlight:!0},{name:"s[i]",value:i[l],highlight:!0},{name:"t[i]",value:u[l],highlight:!0},{name:`sMap['${i[l]}']`,value:s[i[l]]},{name:`tMap['${u[l]}']`,value:n[u[l]]}]});let o=JSON.stringify(Object.fromEntries(Object.entries(s).sort()))===JSON.stringify(Object.fromEntries(Object.entries(n).sort()));return r.push({explanation:o?`sMap == tMap \u2014 every character appears the same number of times in both strings. Return true: "${i}" and "${u}" are anagrams.`:"sMap != tMap \u2014 at least one character frequency differs. Return false.",highlightLine:15,state:{type:"array",cells:t.map(l=>({value:l,state:o?"found":"eliminated"})),pointers:[],hashmap:y({},s),counters:Object.entries(n).map(([l,h])=>({label:`t['${l}']`,value:h}))},variables:[{name:"sMap == tMap",value:o?"true":"false",highlight:!0},{name:"result",value:String(o),highlight:!0}]}),r}function Ua(){let i="anagram",u="nagaram",r=[];r.push({explanation:`Sort both strings. If they produce the same sequence of characters, they are anagrams. s="${i}", t="${u}".`,highlightLine:2,state:{type:"array",cells:i.split("").map(a=>({value:a,state:"default"})),pointers:[],hashmap:{t:u}},variables:[{name:"s",value:i},{name:"t",value:u}]});let s=i.split("").sort().join("");r.push({explanation:`sorted(s) = "${s}".`,highlightLine:2,state:{type:"array",cells:s.split("").map(a=>({value:a,state:"visited"})),pointers:[],hashmap:{t:u,"sorted(t)":"..."}},variables:[{name:"sorted(s)",value:s,highlight:!0}]});let n=u.split("").sort().join("");r.push({explanation:`sorted(t) = "${n}".`,highlightLine:2,state:{type:"array",cells:n.split("").map(a=>({value:a,state:"visited"})),pointers:[],hashmap:{"sorted(s)":s,"sorted(t)":n}},variables:[{name:"sorted(t)",value:n,highlight:!0}]});let t=s===n;return r.push({explanation:`sorted(s) "${s}" ${t?"==":"!="} sorted(t) "${n}" \u2192 return ${t}.`,highlightLine:2,state:{type:"array",cells:s.split("").map((a,e)=>({value:a,state:t?"found":a===n[e]?"visited":"eliminated"})),pointers:[],hashmap:{"sorted(s)":s,"sorted(t)":n}},variables:[{name:"return",value:String(t),highlight:!0}]}),r}var Xa={label:"Hash Map",pythonCode:Ya,generateSteps:Va},Ka={label:"Sort",pythonCode:Ga,generateSteps:Ua},Te={id:"valid-anagram",lcNumber:242,title:"Valid Anagram",difficulty:"Easy",category:"arrays-hash",tags:["Hash Map","String","Sorting"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given two strings s and t, return true if t is an anagram of s, and false otherwise. An anagram uses all the original letters exactly once, just rearranged.",examples:[{input:'s = "anagram",  t = "nagaram"',output:"true"},{input:'s = "rat",  t = "car"',output:"false"}],constraints:["1 \u2264 s.length, t.length \u2264 5 \xD7 10\u2074","s and t consist of lowercase English letters."],hint:"Two strings are anagrams if and only if their character frequency maps are identical. Build both maps in one pass and compare.",solutions:[Xa,Ka]};var Qa=`from typing import List


class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        # prefix and suffix product arrays
        # then loop through and just do result[i] = prefix[i] * suffix[i]
        # [1,2,3,4]
        # prefix: [1,1,2,6]
        # suffix: [24,12,4,1]
        # result = [24,12,8,6]

        prefix = [1] * len(nums)
        suffix = [1] * len(nums)
        result = [1] * len(nums)

        for i in range(1, len(nums)):
            prefix[i] = prefix[i - 1] * nums[i - 1]

        for i in range(len(nums) - 2, -1, -1):
            suffix[i] = suffix[i + 1] * nums[i + 1]

        for i in range(len(nums)):
            result[i] = prefix[i] * suffix[i]

        return result`;function Ja(){let i=[1,2,3,4],u=i.length,r=Array(u).fill(1),s=Array(u).fill(1),n=Array(u).fill(1),t=[];t.push({explanation:"No division allowed. Key insight: result[i] = (product of everything to the left of i) \xD7 (product of everything to the right of i). Build a prefix-product array and a suffix-product array, then multiply them.",highlightLine:6,state:{type:"array",cells:i.map(a=>({value:a,state:"default"})),pointers:[],counters:[{label:"prefix",value:"[1, 1, 1, 1]"},{label:"suffix",value:"[1, 1, 1, 1]"}]},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});for(let a=1;a<u;a++)r[a]=r[a-1]*i[a-1],t.push({explanation:`prefix[${a}] = prefix[${a-1}] \xD7 nums[${a-1}] = ${r[a-1]} \xD7 ${i[a-1]} = ${r[a]}. This is the product of all elements strictly to the LEFT of index ${a}.`,highlightLine:11,state:{type:"array",cells:r.map((e,o)=>({value:e,state:o===a?"active":o<a?"visited":"default"})),pointers:[{index:a,label:"i"}],counters:[{label:"nums",value:`[${i.join(", ")}]`},{label:"suffix",value:"[1, 1, 1, 1]"}]},variables:[{name:"i",value:a,highlight:!0},{name:`prefix[${a}]`,value:r[a],highlight:!0}]});for(let a=u-2;a>=0;a--)s[a]=s[a+1]*i[a+1],t.push({explanation:`suffix[${a}] = suffix[${a+1}] \xD7 nums[${a+1}] = ${s[a+1]} \xD7 ${i[a+1]} = ${s[a]}. This is the product of all elements strictly to the RIGHT of index ${a}.`,highlightLine:14,state:{type:"array",cells:s.map((e,o)=>({value:e,state:o===a?"active":o>a?"visited":"default"})),pointers:[{index:a,label:"i"}],counters:[{label:"nums",value:`[${i.join(", ")}]`},{label:"prefix",value:`[${r.join(", ")}]`}]},variables:[{name:"i",value:a,highlight:!0},{name:`suffix[${a}]`,value:s[a],highlight:!0}]});for(let a=0;a<u;a++)n[a]=r[a]*s[a],t.push({explanation:`result[${a}] = prefix[${a}] \xD7 suffix[${a}] = ${r[a]} \xD7 ${s[a]} = ${n[a]}.`,highlightLine:17,state:{type:"array",cells:n.map((e,o)=>({value:e,state:o===a?"active":o<a?"found":"default"})),pointers:[{index:a,label:"i"}],counters:[{label:"prefix",value:`[${r.join(", ")}]`},{label:"suffix",value:`[${s.join(", ")}]`}]},variables:[{name:"i",value:a,highlight:!0},{name:`prefix[${a}]`,value:r[a]},{name:`suffix[${a}]`,value:s[a]},{name:`result[${a}]`,value:n[a],highlight:!0}]});return t.push({explanation:`Result: [${n.join(", ")}]. Each value is the product of every other element, computed in O(n) time with no division.`,highlightLine:26,state:{type:"array",cells:n.map(a=>({value:a,state:"found"})),pointers:[],counters:[{label:"prefix",value:`[${r.join(", ")}]`},{label:"suffix",value:`[${s.join(", ")}]`}]},variables:[{name:"result",value:`[${n.join(", ")}]`,highlight:!0}]}),t}var Za={label:"Prefix & Suffix",pythonCode:Qa,generateSteps:Ja,timeComplexity:"O(n)",spaceComplexity:"O(n)"},en=`class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        # take advantage of the fact that result does not count towards space complexity
        # store prefix in result, using a variable to help
        # then loop through again multiplying by suffix, using another variable to help

        result = [1] * len(nums)

        prefix = suffix = 1

        for i in range(len(nums)):
            result[i] = prefix
            prefix *= nums[i]

        for i in range(len(nums)-1,-1,-1):
            result[i] *= suffix
            suffix *= nums[i]

        return result`;function tn(){let i=[1,2,3,4],u=i.length,r=[],s=Array(u).fill(1),n=1,t=1,a=(e,o)=>({type:"array",cells:s.map((l,h)=>({value:l,state:h===e?"active":o(h)?"visited":"default"})),pointers:e!==null?[{index:e,label:"i"}]:[],counters:[{label:"prefix",value:n},{label:"suffix",value:t}]});r.push({explanation:"Follow-up: O(1) extra space. The output array doesn't count, so we reuse it. Pass 1 fills result[i] with the product of everything to the LEFT (a running prefix). Pass 2 multiplies in the product of everything to the RIGHT (a running suffix). Just two scalar variables \u2014 no prefix/suffix arrays.",highlightLine:3,state:a(null,()=>!1),variables:[{name:"result",value:`[${s.join(", ")}]`},{name:"prefix",value:1},{name:"suffix",value:1}]});for(let e=0;e<u;e++){let o=n;s[e]=n,n*=i[e],r.push({explanation:`Pass 1, i=${e}: result[${e}] = prefix = ${o} (product of everything left of index ${e}). Then prefix \xD7= nums[${e}]=${i[e]} \u2192 ${n}.`,highlightLine:12,state:a(e,l=>l<e),variables:[{name:"i",value:e},{name:`result[${e}]`,value:s[e],highlight:!0},{name:"prefix",value:n}]})}r.push({explanation:`After pass 1, result = [${s.join(", ")}] \u2014 each cell holds its left-product. Now scan right-to-left with a running suffix starting at 1.`,highlightLine:15,state:a(null,()=>!0),variables:[{name:"result",value:`[${s.join(", ")}]`},{name:"suffix",value:1}]});for(let e=u-1;e>=0;e--){let o=t;s[e]*=t,t*=i[e],r.push({explanation:`Pass 2, i=${e}: result[${e}] \xD7= suffix = ${o} \u2192 ${s[e]} (now folds in the right-product too). Then suffix \xD7= nums[${e}]=${i[e]} \u2192 ${t}.`,highlightLine:16,state:a(e,l=>l>e),variables:[{name:"i",value:e},{name:`result[${e}]`,value:s[e],highlight:!0},{name:"suffix",value:t}]})}return r.push({explanation:`Done. result = [${s.join(", ")}]. O(n) time and O(1) extra space \u2014 no auxiliary arrays, just the prefix and suffix scalars.`,highlightLine:19,state:{type:"array",cells:s.map(e=>({value:e,state:"found"})),pointers:[],counters:[{label:"prefix",value:n},{label:"suffix",value:t}]},variables:[{name:"result",value:`[${s.join(", ")}]`,highlight:!0}]}),r}var an={label:"O(1) Space (prefix then suffix)",pythonCode:en,generateSteps:tn,timeComplexity:"O(n)",spaceComplexity:"O(1)"},Ne={id:"product-of-array-except-self",lcNumber:238,title:"Product of Array Except Self",difficulty:"Medium",category:"arrays-hash",tags:["Array","Prefix Sum"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.",examples:[{input:"nums = [1, 2, 3, 4]",output:"[24, 12, 8, 6]"},{input:"nums = [-1, 1, 0, -3, 3]",output:"[0, 0, 9, 0, 0]"}],constraints:["2 \u2264 nums.length \u2264 10\u2075","-30 \u2264 nums[i] \u2264 30","The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer."],hint:'result[i] needs everything except nums[i]. Split that into "everything to the left" and "everything to the right." Each half can be computed in a single pass.',solutions:[Za,an]};var nn=`class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        # build a frequency map and track the running majority in one pass
        # avoids a second scan by updating the best candidate whenever a count exceeds the current max
        majorityValuePair = (None, 0)
        freqMap = {}
        for num in nums:
            freqMap[num] = 1 + freqMap.get(num, 0)
            if freqMap[num] > majorityValuePair[1]:
                majorityValuePair = num, freqMap[num]
        return majorityValuePair[0]`,sn=`class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        # Boyer-Moore voting: the majority element (> n/2) can never be fully cancelled
        # keep a candidate and a count \u2014 increment when we see the candidate, decrement otherwise
        # when count drops to 0, the candidate has been cancelled; replace it with the current element
        maxValue = nums[0]
        maxCounter = 0
        for num in nums:
            if num == maxValue:
                maxCounter += 1
            else:
                maxCounter -= 1
                if maxCounter < 0:
                    maxValue = num
                    maxCounter = 1
        return maxValue`;function rn(){let i=[2,2,1,1,1,2,2],u=[],r={},s=i[0],n=0;u.push({explanation:"Build a frequency map in one pass. Keep a running majority: whenever freq[num] exceeds the current maximum, update the majority candidate immediately. No second pass needed.",highlightLine:3,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{},counters:[{label:"majority",value:"None"}]},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});for(let t=0;t<i.length;t++){let a=i[t];r[a]=(r[a]??0)+1;let e=s;r[a]>n&&(s=a,n=r[a]);let o=s!==e;u.push({explanation:o?`num=${a}: freq[${a}]=${r[a]} > prev majority freq ${n-1}. New majority \u2192 ${a}.`:`num=${a}: freq[${a}]=${r[a]}. Does not beat current majority (${s}, freq=${n}).`,highlightLine:r[a]>n-(o?1:0)?8:6,state:{type:"array",cells:i.map((l,h)=>({value:l,state:h<t?"visited":h===t?"active":"default"})),pointers:[{index:t,label:"i"}],hashmap:y({},r),counters:[{label:"majority",value:`(${s}, freq=${n})`}]},variables:[{name:"num",value:a,highlight:!0},{name:`freq[${a}]`,value:r[a],highlight:!0},{name:"majority",value:s,highlight:o}]})}return u.push({explanation:`All elements processed. majority = ${s} with frequency ${n} (> n/2 = ${Math.floor(i.length/2)}). O(n) time, O(n) space.`,highlightLine:9,state:{type:"array",cells:i.map(t=>({value:t,state:t===s?"found":"eliminated"})),pointers:[],hashmap:y({},r),counters:[{label:"majority",value:s}]},variables:[{name:"return",value:s,highlight:!0}]}),u}function ln(){let i=[2,2,1,1,1,2,2],u=[],r=i[0],s=0;u.push({explanation:'Boyer-Moore Voting: the majority element (> n/2 occurrences) can "outlast" all other values combined. Maintain a candidate and a count. When the count drops below zero the candidate has been cancelled \u2014 swap to the current element and restart.',highlightLine:3,state:{type:"array",cells:i.map(n=>({value:n,state:"default"})),pointers:[],counters:[{label:"candidate",value:r},{label:"count",value:s}]},variables:[{name:"candidate",value:r},{name:"count",value:s}]});for(let n=0;n<i.length;n++){let t=i[n],a=r,e,o;t===r?(s++,e=`num=${t} matches candidate. count \u2192 ${s}.`,o=7):(s--,s<0?(r=t,s=1,e=`num=${t} != candidate ${a}. count \u2192 -1: candidate cancelled! Swap to ${r}, count=1.`,o=11):(e=`num=${t} != candidate ${a}. count \u2192 ${s}.`,o=9));let l=r!==a;u.push({explanation:e,highlightLine:o,state:{type:"array",cells:i.map((h,d)=>({value:h,state:d<n?"visited":d===n?"active":"default"})),pointers:[{index:n,label:"i"}],counters:[{label:"candidate",value:r},{label:"count",value:s}]},variables:[{name:"num",value:t,highlight:!0},{name:"candidate",value:r,highlight:l},{name:"count",value:s,highlight:!0}]})}return u.push({explanation:`Done. candidate = ${r}. Every non-majority element has been cancelled out at least once. O(n) time, O(1) space.`,highlightLine:13,state:{type:"array",cells:i.map(n=>({value:n,state:n===r?"found":"eliminated"})),pointers:[],counters:[{label:"candidate",value:r},{label:"count",value:s}]},variables:[{name:"return",value:r,highlight:!0}]}),u}var on={label:"Frequency Map",pythonCode:nn,generateSteps:rn},un={label:"Boyer-Moore",pythonCode:sn,generateSteps:ln},Ie={id:"majority-element",lcNumber:169,title:"Majority Element",difficulty:"Easy",category:"arrays-hash",tags:["Array","Hash Map","Boyer-Moore"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an array nums of size n, return the majority element. The majority element is the element that appears more than \u230An/2\u230B times. You may assume the majority element always exists in the array.",examples:[{input:"nums = [3, 2, 3]",output:"3"},{input:"nums = [2, 2, 1, 1, 1, 2, 2]",output:"2"}],constraints:["n == nums.length","1 \u2264 n \u2264 5 \xD7 10\u2074","-10\u2079 \u2264 nums[i] \u2264 10\u2079","The majority element always exists."],hint:'A hashmap tracks frequencies. For O(1) space, Boyer-Moore Voting works because the majority element (> n/2 occurrences) can never be fully "cancelled" by all other elements combined.',solutions:[on,un]};var hn=`from typing import List

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # l = buy day, r = sell day; profit = prices[r] - prices[l]
        # if prices[r] < prices[l], buying at r is strictly better \u2014 move l there
        # this keeps l at the lowest price seen so far without needing a separate min variable
        currentMaxProfit = 0

        l, r = 0, 1

        while r < len(prices):
            currentMaxProfit = max(currentMaxProfit, prices[r] - prices[l])

            if prices[r] < prices[l]:
                l = r
            r += 1

        return currentMaxProfit`;function dn(){let i=[7,1,5,3,6,4],u=[],r=0,s=1,n=0,t=(a,e,o)=>({type:"array",cells:i.map((l,h)=>({value:l,state:h===a?"active":h===e?"window":"default"})),pointers:[{index:a,label:"L (buy)"},{index:e,label:"R (sell)"}],counters:[{label:"max profit",value:o}]});for(u.push({explanation:"L points to our buy day, R to our sell day. We slide R rightward. The key insight: if we see a price lower than L, it's always better to buy there instead \u2014 so we move L to R.",highlightLine:12,state:t(r,s,n),variables:[{name:"l",value:r},{name:"r",value:s},{name:"currentMaxProfit",value:n}]});s<i.length;){let a=i[s]-i[r],e=Math.max(n,a);a>n?u.push({explanation:`prices[R]=${i[s]} \u2212 prices[L]=${i[r]} = ${a}. New best profit! We update maxProfit to ${a}.`,highlightLine:16,state:t(r,s,e),variables:[{name:"l",value:r},{name:"r",value:s},{name:"prices[l]",value:i[r]},{name:"prices[r]",value:i[s]},{name:"prices[r]-prices[l]",value:a,highlight:!0},{name:"currentMaxProfit",value:e,highlight:!0}]}):u.push({explanation:`prices[R]=${i[s]} \u2212 prices[L]=${i[r]} = ${a}. Not better than current max ${n}. Keep going.`,highlightLine:16,state:t(r,s,e),variables:[{name:"l",value:r},{name:"r",value:s},{name:"prices[l]",value:i[r]},{name:"prices[r]",value:i[s]},{name:"prices[r]-prices[l]",value:a},{name:"maxProfit",value:e}]}),n=e,i[s]<i[r]&&(u.push({explanation:`prices[R]=${i[s]} < prices[L]=${i[r]}. This is a lower buy price. Move L here \u2014 buying later at a lower price can only improve future profit. R keeps advancing.`,highlightLine:16,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===s?"active":l===r?"eliminated":"default"})),pointers:[{index:s,label:"L\u2192here"},{index:s,label:"R"}],counters:[{label:"max profit",value:n}]},variables:[{name:"l",value:s,highlight:!0},{name:"r",value:s},{name:"prices[l]",value:i[s],highlight:!0},{name:"currentMaxProfit",value:n}]}),r=s),s++}return u.push({explanation:`R has passed the end. The best profit we found was ${n} (buy low, sell high).`,highlightLine:19,state:t(r,i.length-1,n),variables:[{name:"maxProfit",value:n,highlight:!0}]}),u}var cn={label:"Sliding Window",pythonCode:hn,generateSteps:dn},qe={id:"best-time-to-buy-and-sell-stock",lcNumber:121,title:"Best Time to Buy and Sell Stock",difficulty:"Easy",category:"sliding-window",tags:["Sliding Window","Array","Greedy"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"You are given an array prices where prices[i] is the price of a stock on day i. Choose a single day to buy and a later day to sell to maximize profit. Return the maximum profit, or 0 if no profit is possible.",examples:[{input:"prices = [7, 1, 5, 3, 6, 4]",output:"5",explanation:"Buy on day 2 (price = 1), sell on day 5 (price = 6). Profit = 6 \u2212 1 = 5."},{input:"prices = [7, 6, 4, 3, 1]",output:"0",explanation:"Prices only decrease \u2014 no profitable transaction is possible."}],constraints:["1 \u2264 prices.length \u2264 10\u2075","0 \u2264 prices[i] \u2264 10\u2074"],hint:"You want to buy low and sell high. As you scan left to right, you always want L to be the lowest price seen so far. What condition should make you move L?",solutions:[cn]};var pn=`class Solution:
    # loop method
    def loopSearch(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums)-1

        while l <= r:
            # l + (r - l) // 2 avoids integer overflow for very large indices (same value as (l+r)//2 otherwise)
            mid = l + (r - l) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] > target:
                r = mid - 1
            else:
                l = mid + 1

        return -1`;function mn(){let i=[-1,0,3,5,9,12],u=9,r=[],s=0,n=i.length-1,t=(a,e,o)=>({type:"array",cells:i.map((l,h)=>({value:l,state:h<a||h>e?"eliminated":o!==null&&h===o?"active":"default"})),pointers:[{index:a,label:"L"},{index:e,label:"R"},...o!==null?[{index:o,label:"mid"}]:[]]});for(r.push({explanation:`Array is sorted. L=0, R=${n}. Binary search cuts the search space in half each step \u2014 O(log n) instead of O(n). We can do this because sorted order gives us direction.`,highlightLine:6,state:t(s,n,null),variables:[{name:"l",value:s},{name:"r",value:n},{name:"target",value:u}]});s<=n;){let a=s+Math.floor((n-s)/2);if(r.push({explanation:`mid = L + (R\u2212L)//2 = ${s} + (${n}\u2212${s})//2 = ${a}. nums[mid] = ${i[a]}. We use L+(R\u2212L)//2 instead of (L+R)//2 to avoid integer overflow with large indices.`,highlightLine:13,state:t(s,n,a),variables:[{name:"l",value:s},{name:"r",value:n},{name:"mid",value:a,highlight:!0},{name:"nums[mid]",value:i[a],highlight:!0},{name:"target",value:u}]}),i[a]===u){r.push({explanation:`nums[${a}] = ${i[a]} equals target ${u}. Found! Return ${a}. We cut the search space from ${i.length} to 1 in just ${r.length} steps.`,highlightLine:14,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o===a?"found":o<s||o>n?"eliminated":"default"})),pointers:[{index:a,label:"FOUND"}]},variables:[{name:"mid",value:a},{name:"nums[mid]",value:i[a]},{name:"target",value:u},{name:"result",value:a,highlight:!0}]});break}i[a]>u?(r.push({explanation:`nums[${a}]=${i[a]} > target ${u}. Everything at index \u2265 ${a} is \u2265 ${i[a]} \u2014 all too large. Move R to mid\u22121=${a-1}. Eliminated ${n-a+1} element(s).`,highlightLine:16,state:t(s,a-1,a),variables:[{name:"l",value:s},{name:"r",value:a-1,highlight:!0},{name:"mid",value:a},{name:"nums[mid]",value:i[a]},{name:"target",value:u}]}),n=a-1):(r.push({explanation:`nums[${a}]=${i[a]} < target ${u}. Everything at index \u2264 ${a} is \u2264 ${i[a]} \u2014 all too small. Move L to mid+1=${a+1}. Eliminated ${a-s+1} element(s).`,highlightLine:14,state:t(a+1,n,a),variables:[{name:"l",value:a+1,highlight:!0},{name:"r",value:n},{name:"mid",value:a},{name:"nums[mid]",value:i[a]},{name:"target",value:u}]}),s=a+1)}return r}var gn=`class Solution:
    # recursion method
    def recursiveSearch(self, nums: List[int], target: int) -> int:
        def search(l,r):
            if l > r:
                return -1
            m = l + (r - l) // 2

            if nums[m] == target:
                return m
            if nums[m] > target:
                return search(l,m-1)
            return search(m+1,r)

        return search(0, len(nums)-1)`;function fn(){let i=[-1,0,3,5,9,12],u=9,r=[],s=(e,o,l,h,d=null)=>({type:"array",cells:i.map((c,p)=>({value:c,state:d!==null&&p===d?"found":p<e||p>o?"eliminated":l!==null&&p===l?"active":"default"})),pointers:[{index:e,label:"l"},{index:o,label:"r"},...l!==null?[{index:l,label:"m"}]:[]],counters:[{label:"call stack depth",value:h}]});r.push({explanation:`Same halving idea as the loop, but expressed with recursion: search(l, r) inspects the middle, then CALLS ITSELF on whichever half can still contain the target. The base case l > r means the window is empty \u2192 not found (return \u22121). We kick it off with search(0, ${i.length-1}).`,highlightLine:15,state:s(0,i.length-1,null,0),variables:[{name:"target",value:u}]});let n=0;function t(e,o){if(n++,e>o)return r.push({explanation:`search(${e}, ${o}): l > r, the window is empty. Base case \u2192 return \u22121 (target not present).`,highlightLine:5,state:s(e,o,null,n),variables:[{name:"l",value:e},{name:"r",value:o},{name:"return",value:-1,highlight:!0}]}),n--,-1;let l=e+Math.floor((o-e)/2);if(i[l]===u)return r.push({explanation:`search(${e}, ${o}): m = ${l}, nums[${l}] = ${i[l]} == target ${u}. Found! Return ${l} straight up the call stack.`,highlightLine:10,state:s(e,o,l,n,l),variables:[{name:"l",value:e},{name:"r",value:o},{name:"m",value:l,highlight:!0},{name:"nums[m]",value:i[l]},{name:"return",value:l,highlight:!0}]}),n--,l;if(i[l]>u){r.push({explanation:`search(${e}, ${o}): m = ${l}, nums[${l}] = ${i[l]} > target ${u}. The target must be in the LEFT half. Recurse: search(${e}, ${l-1}). Call stack grows to depth ${n+1}.`,highlightLine:12,state:s(e,o,l,n),variables:[{name:"l",value:e},{name:"r",value:o},{name:"m",value:l},{name:"nums[m]",value:i[l],highlight:!0}]});let d=t(e,l-1);return n--,d}r.push({explanation:`search(${e}, ${o}): m = ${l}, nums[${l}] = ${i[l]} < target ${u}. The target must be in the RIGHT half. Recurse: search(${l+1}, ${o}). Call stack grows to depth ${n+1}.`,highlightLine:13,state:s(e,o,l,n),variables:[{name:"l",value:e},{name:"r",value:o},{name:"m",value:l},{name:"nums[m]",value:i[l],highlight:!0}]});let h=t(l+1,o);return n--,h}let a=t(0,i.length-1);return r.push({explanation:`The found index ${a} bubbles back through every pending recursive call unchanged. Final answer: ${a}. Same O(log n) work as the loop, but O(log n) stack space instead of O(1).`,highlightLine:15,state:s(a,a,a,0,a),variables:[{name:"result",value:a,highlight:!0}]}),r}var Re={id:"binary-search",lcNumber:704,title:"Binary Search",difficulty:"Easy",category:"binary-search",tags:["Binary Search","Array"],timeComplexity:"O(log n)",spaceComplexity:"O(1)",description:"Given a sorted array of integers nums and an integer target, return the index of target if it exists, or -1 if it does not. You must write an algorithm with O(log n) runtime \u2014 no linear scan allowed.",examples:[{input:"nums = [-1, 0, 3, 5, 9, 12],  target = 9",output:"4",explanation:"9 exists in nums at index 4"},{input:"nums = [-1, 0, 3, 5, 9, 12],  target = 2",output:"-1",explanation:"2 does not exist in nums"}],constraints:["1 \u2264 nums.length \u2264 10\u2074","-10\u2074 < nums[i], target < 10\u2074","All integers in nums are unique","nums is sorted in ascending order"],hint:"The array is sorted. If the middle element is too big, where can the target possibly be? If it's too small, where can it be?",solutions:[{label:"Iterative",pythonCode:pn,generateSteps:mn},{label:"Recursive",pythonCode:gn,generateSteps:fn}]};var vn=`class Solution:
    def isValid(self, s: str) -> bool:
        # basically a bunch of if else statements
        # we can insert into stack on opening bracket
        # pop on ending if it matches, return False if not match
        # so one thing we can do is just do an open to close map

        openToCloseMap = {'(' : ')', '{' : '}', '[' : ']'}

        stack = deque()

        for char in s:
            # check first if it is a closing bracket
            if char in openToCloseMap.values():
                # if stack is empty and we see an closing bracket, return false
                # if map[peek] != char, also return false
                if not stack or openToCloseMap.get(stack[-1],None) != char:
                    return False
                # otherwise we got a match, pop out opening bracket
                stack.pop()
            if char in openToCloseMap:
                stack.append(char)
        return not stack`,yn=`class Solution:
    def isValidSet(self, s: str) -> bool:
        # basically a bunch of if else statements
        # we can insert into stack on opening bracket
        # pop on ending if it matches, return False if not match
        # so one thing we can do is just do an open to close map

        openToCloseMap = {'(' : ')', '{' : '}', '[' : ']'}

        closeBrackets = set(openToCloseMap.values())

        stack = deque()

        for char in s:
            # check first if it is a closing bracket
            if char in closeBrackets:
                # if stack is empty and we see an closing bracket, return false
                # if map[peek] != char, also return false
                if not stack or openToCloseMap.get(stack[-1],None) != char:
                    return False
                # otherwise we got a match, pop out opening bracket
                stack.pop()
            if char in openToCloseMap:
                stack.append(char)
        return not stack`;function Pe(i,u){let r="([{}])",s=[],n={"(":")","[":"]","{":"}"},t=new Set([")","]","}"]),a=[];s.push({explanation:i,highlightLine:u.intro,state:{type:"array",cells:r.split("").map(e=>({value:e,state:"default"})),pointers:[],stackItems:[]},variables:[{name:"stack",value:"[]"}]});for(let e=0;e<r.length;e++){let o=r[e],l=t.has(o),h=o in n,d=r.split("").map((c,p)=>({value:c,state:p===e?"active":p<e?"visited":"default"}));if(l){let c=a[a.length-1],p=c?n[c]:null;if(p===o)s.push({explanation:`'${o}' is a closing bracket. Top of stack is '${c}', whose expected closer is '${p}'. They match! Pop '${c}' off the stack.`,highlightLine:u.pop,state:{type:"array",cells:d.map((f,g)=>x(y({},f),{state:g===e?"found":f.state})),pointers:[{index:e,label:"i"}],stackItems:[...a]},variables:[{name:"char",value:o,highlight:!0},{name:"stack[-1]",value:c},{name:"match",value:"yes",highlight:!0},{name:"len(stack)",value:a.length-1}]}),a.pop();else{s.push({explanation:`'${o}' is a closing bracket but ${c?`top of stack '${c}' expects '${p}', not '${o}'`:"the stack is empty"}. Mismatch \u2014 return false.`,highlightLine:u.mismatch,state:{type:"array",cells:d.map((f,g)=>x(y({},f),{state:g===e?"eliminated":f.state})),pointers:[{index:e,label:"i"}],stackItems:[...a]},variables:[{name:"char",value:o,highlight:!0},{name:"stack[-1]",value:c??"empty",highlight:!0},{name:"match",value:"no",highlight:!0},{name:"result",value:"false",highlight:!0}]});break}}h&&(s.push({explanation:`'${o}' is an opening bracket. Push it onto the stack. We'll match it when we see its partner '${n[o]}'. Stack is LIFO \u2014 last in, first out.`,highlightLine:u.push,state:{type:"array",cells:d,pointers:[{index:e,label:"i"}],stackItems:[...a,o]},variables:[{name:"char",value:o,highlight:!0},{name:"openToCloseMap[char]",value:n[o]},{name:"stack[-1]",value:o,highlight:!0}]}),a.push(o))}return s.push({explanation:`All characters processed. Stack is ${a.length===0?"empty \u2014 every opener was matched":"not empty \u2014 some openers were never closed"}. Return ${a.length===0}.`,highlightLine:u.final,state:{type:"array",cells:r.split("").map(e=>({value:e,state:"visited"})),pointers:[],stackItems:[...a],counters:[{label:"result",value:a.length===0?"true":"false"}]},variables:[{name:"stack",value:a.length===0?"empty":`[${a.join(", ")}]`},{name:"result",value:String(a.length===0),highlight:!0}]}),s}function bn(){return Pe('Input: "([{}])". A stack is perfect here because brackets must be closed in LIFO order \u2014 the most recently opened bracket must be the next one closed. We map each opener to its expected closer.',{intro:8,push:22,pop:20,mismatch:18,final:23})}function wn(){return Pe('Same stack logic, one micro-optimization: we pre-build closeBrackets = set(openToCloseMap.values()). Checking "is this char a closing bracket?" against a set is O(1), whereas "char in openToCloseMap.values()" rebuilds and scans the values list every time \u2014 O(k) per check. Identical steps, slightly faster closing-bracket test.',{intro:10,push:24,pop:22,mismatch:20,final:25})}var xn={label:"Stack",pythonCode:vn,generateSteps:bn},$n={label:"Stack + Set",pythonCode:yn,generateSteps:wn},Ae={id:"valid-parentheses",lcNumber:20,title:"Valid Parentheses",difficulty:"Easy",category:"stack",tags:["Stack","String"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given a string s containing only the characters '(', ')', '{', '}', '[' and ']', determine if the string is valid. A string is valid if every open bracket is closed by the same bracket type, in the correct order.",examples:[{input:'s = "()"',output:"true"},{input:'s = "()[]{}"',output:"true"},{input:'s = "([{}])"',output:"true",explanation:"Properly nested"},{input:'s = "(]"',output:"false",explanation:"Wrong closing bracket type"}],constraints:["1 \u2264 s.length \u2264 10\u2074","s consists of parentheses only: '()[]{}'"],hint:`When you see a closing bracket, what's the only opening bracket it could match? What data structure remembers the "most recent unmatched opener"?`,solutions:[xn,$n]};var kn=`class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # so this is clearly a bfs question
        # So how do we determine we have an island
        # And how do we know when to continue looking
        # how do know the 1s are part of the same island

        if not grid:
            return 0

        rows, cols = len(grid), len(grid[0])
        visited = set()
        islandCount = 0

        def bfs(row,col):
            queue = collections.deque()
            currentCoordinate = (row,col)
            visited.add(currentCoordinate)
            queue.append(currentCoordinate)

            while queue:
                r, c = queue.popleft()
                # check the 4 neighbors of this coordinate
                # east, west, north, south
                directions = [[1,0], [-1,0], [0,1], [0,-1]]

                for dr, dc in directions:
                    # if neighbor is a valid unvisited land
                    # mark it as visited
                    neighourCoordinate = (r+dr, c+dc)
                    if (r + dr in range(rows)
                        and c + dc in range(cols)
                        and grid[r+dr][c+dc] == '1'
                        and neighourCoordinate not in visited):
                        queue.append(neighourCoordinate)
                        visited.add(neighourCoordinate)

        for r in range(rows):
            for c in range(cols):
                # when we see an unvisited island
                # we perform bfs on it to mark all land connected to it
                if grid[r][c] == '1' and (r,c) not in visited:
                    bfs(r,c)
                    islandCount+=1

        return islandCount`;function Sn(){let i=[["1","1","0","0"],["1","0","0","1"],["0","0","1","1"],["0","0","0","0"]],u=i.length,r=i[0].length,s=[],n=new Set,t=0,a=(l,h)=>`${l},${h}`,e=l=>({type:"grid",grid:i.map((h,d)=>h.map((c,p)=>{let m=a(d,p);return l.has(m)?{state:l.get(m)}:n.has(m)?{state:"visited"}:{state:c==="1"?"land":"water"}})),counters:[{label:"islands",value:t}]});s.push({explanation:"We scan the grid cell by cell. When we find unvisited land ('1'), we BFS to mark all connected land as part of the same island \u2014 so we never count a cell twice.",highlightLine:38,state:e(new Map),variables:[{name:"rows",value:u},{name:"cols",value:r},{name:"islandCount",value:0},{name:"visited",value:0}]});let o=[[1,0],[-1,0],[0,1],[0,-1]];for(let l=0;l<u;l++)for(let h=0;h<r;h++)if(i[l][h]==="1"&&!n.has(a(l,h))){t++,s.push({explanation:`Found unvisited land at (${l},${h}). This starts island #${t}. We launch BFS from here to find all land cells connected to this island.`,highlightLine:42,state:e(new Map([[a(l,h),"queued"]])),variables:[{name:"r",value:l,highlight:!0},{name:"c",value:h,highlight:!0},{name:"islandCount",value:t,highlight:!0},{name:"queue",value:`[(${l},${h})]`},{name:"visited",value:n.size}]});let d=[[l,h]];for(n.add(a(l,h));d.length>0;){let[c,p]=d.shift(),m=new Map;m.set(a(c,p),"visited");for(let[g,v]of o){let w=c+g,b=p+v,$=a(w,b);w>=0&&w<u&&b>=0&&b<r&&i[w][b]==="1"&&!n.has($)&&(m.set($,"queued"),d.push([w,b]),n.add($))}let f=d.length===0?"\u2205":d.length<=3?`[${d.map(([g,v])=>`(${g},${v})`).join(", ")}]`:`${d.length} items`;s.push({explanation:`BFS: processing (${c},${p}). Mark it visited. Enqueue unvisited land neighbors (shown in orange). BFS ensures we explore the whole island level by level.`,highlightLine:22,state:e(m),variables:[{name:"r",value:c,highlight:!0},{name:"c",value:p,highlight:!0},{name:"islandCount",value:t},{name:"queue",value:f},{name:"visited",value:n.size}]})}}return s.push({explanation:`Scan complete. We found ${t} island(s). BFS guaranteed every connected land group was counted exactly once, regardless of island shape.`,highlightLine:46,state:e(new Map),variables:[{name:"islandCount",value:t,highlight:!0},{name:"visited",value:`${n.size} cells`}]}),s}var Ln=`class Solution:
    def numIslandsDFS(self, grid: List[List[str]]) -> int:
        # so we can do DFS as well to traverse the island
        # we will traverse if node is land
        # check all neighbors and mark all land neighbors as visited
        # when we return, we will add 1 to island count

        visited = set()
        result = 0

        rows, cols = len(grid), len(grid[0])

        def dfs(row, col):
            # base case to stop is if we find water
            # if we are out of bounds, return 0
            if row < 0 or row >= rows or col < 0 or col >= cols:
                return 0

            # if we find water, return 0
            if grid[row][col] == '0':
                return 0

            # if we already visited, return 0
            if (row, col) in visited:
                return 0

            # mark current node as visited
            visited.add((row, col))
            # now we go as deep as possible in all 4 directions
            dfs(row+1,col)
            dfs(row-1,col)
            dfs(row,col+1)
            dfs(row,col-1)

            return 1

        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == '1' and (row,col) not in visited:
                    result+=dfs(row,col)
        return result`;function On(){let i=[["1","1","0","0"],["1","0","0","1"],["0","0","1","1"],["0","0","0","0"]],u=i.length,r=i[0].length,s=[],n=new Set,t=0,a=(l,h)=>`${l},${h}`,e=l=>({type:"grid",grid:i.map((h,d)=>h.map((c,p)=>{let m=a(d,p);return l&&l[0]===d&&l[1]===p?{state:"queued"}:n.has(m)?{state:"visited"}:{state:c==="1"?"land":"water"}})),counters:[{label:"islands",value:t}]});s.push({explanation:"DFS explores as deeply as possible before backtracking. No explicit queue \u2014 DFS uses the call stack itself. When we find unvisited land, we mark it and immediately recurse into every neighbor.",highlightLine:13,state:e(null),variables:[{name:"rows",value:u},{name:"cols",value:r},{name:"result",value:0}]});function o(l,h){l<0||l>=u||h<0||h>=r||i[l][h]!=="0"&&(n.has(a(l,h))||(n.add(a(l,h)),s.push({explanation:`DFS at (${l},${h}): land and unvisited. Mark visited (now green). Recurse down \u2192 up \u2192 right \u2192 left \u2014 going as deep as possible before backtracking.`,highlightLine:28,state:e([l,h]),variables:[{name:"row",value:l,highlight:!0},{name:"col",value:h,highlight:!0},{name:"visited",value:n.size}]}),o(l+1,h),o(l-1,h),o(l,h+1),o(l,h-1)))}for(let l=0;l<u;l++)for(let h=0;h<r;h++)i[l][h]==="1"&&!n.has(a(l,h))&&(t++,s.push({explanation:`Outer loop found unvisited land at (${l},${h}). Starting DFS to mark all connected land as island #${t}.`,highlightLine:39,state:e([l,h]),variables:[{name:"row",value:l,highlight:!0},{name:"col",value:h,highlight:!0},{name:"result",value:t,highlight:!0}]}),o(l,h));return s.push({explanation:`DFS complete. Found ${t} island(s). DFS and BFS both visit each cell once \u2014 O(m\xD7n). DFS uses O(m\xD7n) call-stack space in the worst case vs BFS's explicit queue.`,highlightLine:41,state:e(null),variables:[{name:"result",value:t,highlight:!0},{name:"visited",value:`${n.size} cells`}]}),s}var je={id:"number-of-islands",lcNumber:200,title:"Number of Islands",difficulty:"Medium",category:"graphs",tags:["BFS","DFS","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"Given an m \xD7 n 2D grid of '1's (land) and '0's (water), return the number of islands. An island is formed by connecting adjacent land cells horizontally or vertically, and is surrounded by water on all sides.",examples:[{input:'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]',output:"2",explanation:"Top-left cluster and bottom-right cell are separate islands"},{input:'grid = [["1","1","1"],["0","1","0"],["1","1","1"]]',output:"1",explanation:"All land cells are connected through the center"}],constraints:["m == grid.length","n == grid[i].length","1 \u2264 m, n \u2264 300","grid[i][j] is '0' or '1'"],hint:"When you find a land cell, how do you make sure you count its entire island as one? Think about marking cells so you never visit the same land twice.",solutions:[{label:"BFS",pythonCode:kn,generateSteps:Sn},{label:"DFS",pythonCode:Ln,generateSteps:On}]};var Cn=`from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseListIterative(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # prev starts as None so the new tail correctly points to null
        # temp saves current.next before we overwrite it \u2014 without it we'd lose our forward reference
        prev, current = None, head

        while current is not None:
            # put current.next in temp variable
            temp = current.next
            # change what current points to
            current.next = prev
            # prev should now be current
            prev = current
            # current is now next
            current = temp
        return prev`;function Mn(){let i=[1,2,3,4,5],u=[],r=(a,e,o)=>i.map((l,h)=>({id:`n${h}`,value:l,nextId:h<i.length-1?`n${h+1}`:null,state:h<o?"done":h===a?"prev":h===e?"curr":"default"}));u.push({explanation:"We need three pointers to reverse in-place without losing our position. prev starts at null (the new tail's next will be null). current starts at head. We'll move one step at a time, redirecting each node's next pointer.",highlightLine:12,state:{type:"linked-list",nodes:r(null,0,0),pointers:[{nodeId:null,label:"prev"},{nodeId:"n0",label:"curr"}]},variables:[{name:"prev",value:"null"},{name:"current",value:i[0]}]});let s=null,n=0,t=0;for(;n<i.length;){let a=n+1<i.length?n+1:null;u.push({explanation:`Save temp = current.next (node ${a!==null?i[a]:"null"}) before we overwrite it. Without this, we'd lose our forward reference after redirecting current's next.`,highlightLine:16,state:{type:"linked-list",nodes:r(s,n,t),pointers:[{nodeId:s!==null?`n${s}`:null,label:"prev"},{nodeId:`n${n}`,label:"curr"},{nodeId:a!==null?`n${a}`:null,label:"temp"}]},variables:[{name:"prev",value:s!==null?i[s]:"null"},{name:"current",value:i[n],highlight:!0},{name:"temp",value:a!==null?i[a]:"null",highlight:!0}]}),u.push({explanation:`Point current.next \u2192 prev. Node ${i[n]} now points backward. This is the reversal step \u2014 we're flipping one arrow at a time.`,highlightLine:18,state:{type:"linked-list",nodes:i.map((e,o)=>({id:`n${o}`,value:e,nextId:o<t?o>0?`n${o-1}`:null:o<i.length-1?`n${o+1}`:null,state:o<t?"done":o===n?"curr":o===(s??-1)?"prev":"default"})),pointers:[{nodeId:s!==null?`n${s}`:null,label:"prev"},{nodeId:`n${n}`,label:"curr"}]},variables:[{name:"current",value:i[n],highlight:!0},{name:"current.next",value:s!==null?i[s]:"null",highlight:!0},{name:"prev",value:s!==null?i[s]:"null"}]}),u.push({explanation:"Advance: prev = current, current = temp. We've committed this reversal. Move the window one step forward.",highlightLine:20,state:{type:"linked-list",nodes:r(n,a,n+1),pointers:[{nodeId:`n${n}`,label:"prev"},{nodeId:a!==null?`n${a}`:null,label:"curr"}]},variables:[{name:"prev",value:i[n],highlight:!0},{name:"current",value:a!==null?i[a]:"null",highlight:!0}]}),t=n+1,s=n,n=a!==null?a:i.length}return u.push({explanation:`current is null \u2014 we've processed every node. prev now points to the new head (${i[i.length-1]}). The list is fully reversed with O(1) space.`,highlightLine:23,state:{type:"linked-list",nodes:i.map((a,e)=>({id:`n${e}`,value:a,nextId:e>0?`n${e-1}`:null,state:"done"})).reverse(),pointers:[{nodeId:`n${i.length-1}`,label:"head"}]},variables:[{name:"prev",value:i[i.length-1],highlight:!0},{name:"current",value:"null"}]}),u}var Tn=`from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseListRecursion(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # base case to stop at the last node
        if head is None or head.next is None:
            return head

        # if we have 3 -> 4 -> 5 -> None only
        # returnNode would be 5 and head would be 4
        returnNode = self.reverseListRecursion(head.next)
        # since we passed head.next to the recursive call
        # we need to change its next
        # 4 is head in this case, 4.next is 5
        head.next.next = head
        # 4.next would be None
        head.next = None
        # return the base case node
        return returnNode`;function Nn(){let i=[1,2,3,4,5],u=i.length,r=[],s=i.map((t,a)=>a<u-1?`n${a+1}`:null),n=t=>i.map((a,e)=>({id:`n${e}`,value:a,nextId:s[e],state:t[e]??"default"}));r.push({explanation:"Recursive approach: dive to the end of the list first, then reverse pointers on the way back. Two key lines: head.next.next = head (flip the arrow) and head.next = None (sever the forward link).",highlightLine:9,state:{type:"linked-list",nodes:n({}),pointers:[{nodeId:"n0",label:"head"}]},variables:[{name:"head",value:i[0]}]}),r.push({explanation:"Recursion dives right: reverseList(1) \u2192 reverseList(2) \u2192 \u2026 \u2192 reverseList(5). Node 5 has head.next == None \u2014 base case. Return node 5 as the new head. No work done on the way in, only on the way back.",highlightLine:11,state:{type:"linked-list",nodes:n({0:"active",1:"active",2:"active",3:"active",4:"curr"}),pointers:[{nodeId:`n${u-1}`,label:"head"},{nodeId:`n${u-1}`,label:"returnNode"}]},variables:[{name:"head",value:i[u-1],highlight:!0},{name:"head.next",value:"None \u2192 base case!",highlight:!0},{name:"returnNode",value:i[u-1]}]});for(let t=u-2;t>=0;t--){let a=i[t],e=i[t+1];s[t+1]=`n${t}`,s[t]=null;let o={};for(let l=0;l<t;l++)o[l]="active";o[t]="curr";for(let l=t+1;l<u;l++)o[l]="done";r.push({explanation:`Returning with head=${a}: ${e}.next = ${a} (arrow flipped). ${a}.next = None (forward link severed). Reversed so far: ${i.slice(t).reverse().join("\u2192")}.`,highlightLine:t===u-2?20:22,state:{type:"linked-list",nodes:n(o),pointers:[{nodeId:`n${t}`,label:"head"},{nodeId:`n${u-1}`,label:"returnNode"}]},variables:[{name:"head",value:a,highlight:!0},{name:"head.next.next",value:`\u2192 ${a}`,highlight:!0},{name:"head.next",value:"None",highlight:!0},{name:"returnNode",value:i[u-1]}]})}return r.push({explanation:`All pointers reversed. returnNode (${i[u-1]}) bubbles up through every stack frame as the new head. O(n) time, O(n) space for the call stack (one frame per node).`,highlightLine:24,state:{type:"linked-list",nodes:i.map((t,a)=>({id:`n${a}`,value:t,nextId:s[a],state:"done"})).reverse(),pointers:[{nodeId:`n${u-1}`,label:"head"}]},variables:[{name:"returnNode",value:i[u-1],highlight:!0}]}),r}var Ee={id:"reverse-linked-list",lcNumber:206,title:"Reverse Linked List",difficulty:"Easy",category:"linked-list",tags:["Linked List","Two Pointers","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given the head of a singly linked list, reverse the list, and return the reversed list.",examples:[{input:"head = [1,2,3,4,5]",output:"[5,4,3,2,1]"},{input:"head = [1,2]",output:"[2,1]"},{input:"head = []",output:"[]"}],constraints:["The number of nodes in the list is in the range [0, 5000].","-5000 <= Node.val <= 5000"],hint:"To reverse a node's pointer, you need to know both where it currently points AND what was behind it. How many pointers do you need to track those things?",solutions:[{label:"Iterative",pythonCode:Cn,generateSteps:Mn},{label:"Recursive",pythonCode:Tn,generateSteps:Nn}]};var In=`class Solution:
    def mergeTwoLists(self, list1, list2):
        # creating new linked list
        # thus we should use a dummy node to keep track of new head

        # value is irrelevant, using -101 since constraint says node.val >= -100
        dummy = ListNode(-101)

        # now we need a cursor to actually traverse the list
        # we initialize it to dummy so we keep references to it
        current = dummy

        # while both of the lists are not null
        # we want to compare and provide lowest to current

        while list1 and list2:
            if list1.val < list2.val:
                current.next = list1
                list1 = list1.next
            else:
                current.next = list2
                list2 = list2.next
            current = current.next

        # when we are here, we know one of the list is null

        if list1:
            current.next = list1
        else:
            current.next = list2

        return dummy.next`,qn=`class Solution:
    def mergeTwoListsRecursive(self, list1, list2):
        # since we are merging, we have to do forward-order
        # meaning we have to make our decision on our way down the call stack

        # if either side is empty, we just set next to the rest of the other list
        if not list1:
            return list2

        if not list2:
            return list1

        # knowing neither is None here, we check value
        # if list1.val is smaller, we want to increment list1
        # otherwise increment list2
        if list1.val < list2.val:
            list1.next = self.mergeTwoListsRecursive(list1.next, list2)
            # forward traversal, thus since list1 is set in stone, we return it
            return list1
        else:
            list2.next = self.mergeTwoListsRecursive(list1, list2.next)
            # forward traversal, thus since list2 is set in stone, we return it
            return list2`,O=[1,2,4],C=[1,3,4];function G(i,u){let r=O.map((n,t)=>({id:`a${t}`,value:n,nextId:t<O.length-1?`a${t+1}`:null,state:i===t?"curr":i!==null&&t<i?"done":"default"})),s=C.map((n,t)=>({id:`b${t}`,value:n,nextId:t<C.length-1?`b${t+1}`:null,state:u===t?"prev":u!==null&&t<u?"done":"default"}));return[...r,...s]}function ue(i){return i.map((u,r)=>({id:`r${r}`,value:u,nextId:r<i.length-1?`r${r+1}`:null,state:"done"}))}function Rn(){let i=[],u=[],r=0,s=0;for(i.push({explanation:"Iterative merge: create a dummy head to simplify edge cases. p1 and p2 scan list1 and list2. At each step pick the smaller head, attach it to the result, and advance that pointer.",highlightLine:3,state:{type:"linked-list",nodes:G(0,0),pointers:[{nodeId:"a0",label:"p1"},{nodeId:"b0",label:"p2"}],result:[]}});r<O.length&&s<C.length;){let n=O[r],t=C[s];if(n<=t){u.push(n);let a=r;r++,i.push({explanation:`p1.val=${n} \u2264 p2.val=${t}. Take ${n} from list1 into result. Advance p1.`,highlightLine:7,state:{type:"linked-list",nodes:G(r<O.length?r:null,s),pointers:[...r<O.length?[{nodeId:`a${r}`,label:"p1"}]:[{nodeId:null,label:"p1=null"}],{nodeId:`b${s}`,label:"p2"}],result:ue(u)},variables:[{name:"took",value:n,highlight:!0},{name:"p1",value:r<O.length?`list1[${r}]=${O[r]}`:"null"},{name:"result",value:`[${u.join(",")}]`}]})}else{u.push(t);let a=s;s++,i.push({explanation:`p1.val=${n} > p2.val=${t}. Take ${t} from list2 into result. Advance p2.`,highlightLine:11,state:{type:"linked-list",nodes:G(r,s<C.length?s:null),pointers:[{nodeId:`a${r}`,label:"p1"},...s<C.length?[{nodeId:`b${s}`,label:"p2"}]:[{nodeId:null,label:"p2=null"}]],result:ue(u)},variables:[{name:"took",value:t,highlight:!0},{name:"p2",value:s<C.length?`list2[${s}]=${C[s]}`:"null"},{name:"result",value:`[${u.join(",")}]`}]})}}for(;r<O.length;)u.push(O[r++]);for(;s<C.length;)u.push(C[s++]);return i.push({explanation:`One list exhausted. Append the remaining tail: [${(r<O.length?O.slice(r):C.slice(s)).join("\u2192")}]. Done \u2014 merged list: 1\u21921\u21922\u21923\u21924\u21924. O(m+n) time, O(1) extra space.`,highlightLine:14,state:{type:"linked-list",nodes:G(null,null),pointers:[{nodeId:null,label:"p1"},{nodeId:null,label:"p2"}],result:ue(u)},variables:[{name:"return",value:`[${u.join("\u2192")}]`,highlight:!0}]}),i}function Pn(){let i=[],u=[{desc:"Call 1",l1:"1\u21922\u21924",l2:"1\u21923\u21924",action:"1 \u2264 1 \u2192 list1.next = recurse(2\u21924, 1\u21923\u21924)",returns:"list1 (1)"},{desc:"Call 2",l1:"2\u21924",l2:"1\u21923\u21924",action:"2 > 1 \u2192 list2.next = recurse(2\u21924, 3\u21924)",returns:"list2 (1)"},{desc:"Call 3",l1:"2\u21924",l2:"3\u21924",action:"2 \u2264 3 \u2192 list1.next = recurse(4, 3\u21924)",returns:"list1 (2)"},{desc:"Call 4",l1:"4",l2:"3\u21924",action:"4 > 3 \u2192 list2.next = recurse(4, 4)",returns:"list2 (3)"},{desc:"Call 5",l1:"4",l2:"4",action:"4 \u2264 4 \u2192 list1.next = recurse(null, 4)",returns:"list1 (4)"},{desc:"Call 6",l1:"null",l2:"4",action:"list1 is null \u2192 base case, return list2",returns:"list2 (4)"}],r=["","","","","1\u2192","1\u21921\u2192","1\u21921\u21922\u2192","1\u21921\u21922\u21923\u2192","1\u21921\u21922\u21923\u21924\u2192","1\u21921\u21922\u21923\u21924\u21924"];return i.push({explanation:"Recursive merge: at each call, compare the heads. Attach the smaller one and recurse on the rest. The call stack unwinds returning each head in order, building the merged list bottom-up.",highlightLine:3,state:{type:"linked-list",nodes:G(0,0),pointers:[{nodeId:"a0",label:"list1"},{nodeId:"b0",label:"list2"}]}}),u.forEach((s,n)=>{i.push({explanation:`${s.desc}: list1=[${s.l1}], list2=[${s.l2}]. ${s.action} \u2192 return ${s.returns}.`,highlightLine:s.l1==="null"?3:s.l2==="null"?5:7,state:{type:"linked-list",nodes:G(s.l1==="null"?null:O.findIndex(t=>t===parseInt(s.l1)),s.l2==="null"?null:C.findIndex(t=>t===parseInt(s.l2))),pointers:[{nodeId:s.l1==="null"?null:`a${O.findIndex(t=>t===parseInt(s.l1))}`,label:"list1"},{nodeId:s.l2==="null"?null:`b${C.findIndex(t=>t===parseInt(s.l2))}`,label:"list2"}]},variables:[{name:"depth",value:n+1},{name:"action",value:s.action,highlight:!0},{name:"returns",value:s.returns,highlight:!0}]})}),i.push({explanation:"All 6 calls return. The linked chain built during the unwind is: 1\u21921\u21922\u21923\u21924\u21924. O(m+n) time, O(m+n) space for the call stack.",highlightLine:11,state:{type:"linked-list",nodes:G(null,null),pointers:[],result:ue([1,1,2,3,4,4])},variables:[{name:"return",value:"1\u21921\u21922\u21923\u21924\u21924",highlight:!0}]}),i}var An={label:"Iterative",pythonCode:In,generateSteps:Rn},jn={label:"Recursive",pythonCode:qn,generateSteps:Pn},Fe={id:"merge-two-sorted-lists",lcNumber:21,title:"Merge Two Sorted Lists",difficulty:"Easy",category:"linked-list",tags:["Linked List","Recursion"],timeComplexity:"O(m+n)",spaceComplexity:"O(1)",description:"You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",examples:[{input:"list1 = [1,2,4], list2 = [1,3,4]",output:"[1,1,2,3,4,4]"},{input:"list1 = [], list2 = []",output:"[]"},{input:"list1 = [], list2 = [0]",output:"[0]"}],constraints:["The number of nodes in both lists is in the range [0, 50].","-100 \u2264 Node.val \u2264 100","Both list1 and list2 are sorted in non-decreasing order."],hint:"Use a dummy head to avoid special-casing the empty result. Compare the two current heads, attach the smaller one, and advance that pointer. When one list is exhausted, attach the rest of the other directly.",solutions:[An,jn]};var En=`class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        # so this is clearly a bfs problem
        # what happens is when we hit a rotten orange, we perform a bfs on it to mark its neighbors as rotten
        # The above is wrong, we need to do a pre-scan to find all rotten oranges
        # because otherwise we will not be able to scan in real time
        # but one thing we have to keep notice is what if the orange there is already rotten
        # then we need to do a bfs on that so we should have a bfs helper function
        # we also need to check at the end if there are leftovers non-rotten oranges
        # The above here is also wrong, we should instead keep track of a starting count of fresh oranges
        # and decrement every time we mark one as rotten and if the number is not 0 at the end, we return false
        # we don't actually need a visited set like usual since when we rot the oranges, we mark the node as 2
        # which is equivalent of rotten here

        minute = 0

        neighbors = [[1,0], [-1,0], [0,1], [0,-1]]

        rottenQueue = collections.deque()
        freshOrangeCounter = 0

        rows, cols = len(grid), len(grid[0])

        # initial scan for rotten oranges and fresh oranges
        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == 1:
                    freshOrangeCounter+=1
                elif grid[row][col] == 2:
                    rottenQueue.append((row,col))

        # now we spread the rot to neighbors
        # we also need to make sure there are fresh oranges to spread to
        while rottenQueue and freshOrangeCounter > 0:
            # we actually need to keep track of how many rotten oranges we have to start
            # this way we accurately depict how much time has passed
            numberOfRottenOranges = len(rottenQueue)
            for _ in range(numberOfRottenOranges):
                currentRow, currentCol = rottenQueue.popleft()
                for rowIncrement, colIncrement in neighbors:
                    # if 0, we don't do anything
                    # if 1, we rotten them by adding them to visited and rottenQueue
                    neighborRow = currentRow + rowIncrement
                    neighborCol = currentCol + colIncrement
                    if neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols and grid[neighborRow][neighborCol] == 1:
                        # change it to rotten
                        grid[neighborRow][neighborCol] = 2
                        # add to queue
                        rottenQueue.append((neighborRow, neighborCol))
                        # decrement fresh counter
                        freshOrangeCounter-=1
                # with this breadth over, we will increment time
            minute+=1

        if freshOrangeCounter > 0:
            return -1
        else:
            return minute`;function Fn(){let i=[[2,1,1],[1,1,0],[0,1,1]],u=i.length,r=i[0].length,s=[],n=i.map(d=>[...d]),t=(d,c,p={})=>({type:"grid",grid:n.map((m,f)=>m.map((g,v)=>{let w=!!p.active&&p.active[0]===f&&p.active[1]===v,b=p.queued?.some(([Y,T])=>Y===f&&T===v),$=p.newlyRotten?.some(([Y,T])=>Y===f&&T===v);return g===0?{state:"empty"}:g===1?{state:$?"rotten":"fresh"}:w?{state:"active"}:$?{state:"rotten"}:{state:b?"queued":"rotten"}})),counters:[{label:"minute",value:d},{label:"fresh left",value:c}]}),a=[],e=0;for(let d=0;d<u;d++)for(let c=0;c<r;c++)n[d][c]===1&&e++,n[d][c]===2&&a.push([d,c]);s.push({explanation:`Initial grid: ${a.length} rotten orange(s) (\u2620) and ${e} fresh orange(s) (\u25C9). Pre-scan collects all rotten oranges into the BFS queue \u2014 multi-source BFS means rotting spreads from ALL of them simultaneously, not one at a time.`,highlightLine:25,state:t(0,e),variables:[{name:"minute",value:0},{name:"freshOrangeCounter",value:e,highlight:!0},{name:"rottenQueue",value:a.length,highlight:!0}]});let o=[[1,0],[-1,0],[0,1],[0,-1]],l=0;for(;a.length>0&&e>0;){let d=a.length,c=[];s.push({explanation:`Minute ${l+1} begins: snapshot numberOfRottenOranges = ${d} (the oranges already rotten at the start of this minute). We'll pop exactly these ${d} and let each infect its neighbors. Processing one whole BFS level = one minute passing.`,highlightLine:37,state:t(l,e,{queued:a.slice(0,d)}),variables:[{name:"minute",value:l+1,highlight:!0},{name:"freshOrangeCounter",value:e},{name:"numberOfRottenOranges",value:d,highlight:!0}]});for(let p=0;p<d;p++){let[m,f]=a.shift(),g=[];for(let[v,w]of o){let b=m+v,$=f+w;b>=0&&b<u&&$>=0&&$<r&&n[b][$]===1&&(n[b][$]=2,a.push([b,$]),e--,g.push([b,$]),c.push([b,$]))}s.push({explanation:`Minute ${l+1}, pop ${p+1}/${d}: take rotten orange (${m},${f}) off the queue and check its 4 neighbors. ${g.length?`Fresh orange(s) at ${g.map(([v,w])=>`(${v},${w})`).join(", ")} become rotten \u2014 mark them 2, push to queue, decrement fresh.`:"No fresh neighbor (each is out of bounds, empty, or already rotten) \u2014 nothing to rot."} fresh left: ${e}.`,highlightLine:g.length?49:47,state:t(l,e,{queued:a.slice(),newlyRotten:g,active:[m,f]}),variables:[{name:"pop",value:`(${m},${f})`,highlight:!0},{name:"rotted this pop",value:g.length},{name:"freshOrangeCounter",value:e,highlight:g.length>0},{name:"rottenQueue",value:a.length}]})}l++,s.push({explanation:`Minute ${l} complete: all ${d} orange(s) from this level processed, ${c.length} new orange(s) rotted in total this minute. ${e} fresh remain. The newly-rotten oranges form the next BFS level.`,highlightLine:53,state:t(l,e,{queued:a.slice(),newlyRotten:c}),variables:[{name:"minute",value:l,highlight:!0},{name:"freshOrangeCounter",value:e,highlight:!0},{name:"newly rotted",value:c.length},{name:"rottenQueue",value:a.length}]})}let h=e>0?-1:l;return s.push({explanation:e>0?`${e} fresh orange(s) are unreachable \u2014 isolated by empty cells. Return -1.`:`All oranges rotten after ${l} minute(s). Multi-source BFS naturally gives us the minimum time because it spreads optimally from all sources in parallel.`,highlightLine:58,state:t(l,e),variables:[{name:"result",value:h,highlight:!0},{name:"freshOrangeCounter",value:e},{name:"minute",value:l}]}),s}var Dn={label:"Multi-Source BFS",pythonCode:En,generateSteps:Fn},De={id:"rotting-oranges",lcNumber:994,title:"Rotting Oranges",difficulty:"Medium",category:"graphs",tags:["BFS","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"You are given an m \xD7 n grid where each cell is 0 (empty), 1 (fresh orange), or 2 (rotten orange). Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh oranges remain, or -1 if impossible.",examples:[{input:"grid = [[2,1,1],[1,1,0],[0,1,1]]",output:"4"},{input:"grid = [[2,1,1],[0,1,1],[1,0,1]]",output:"-1",explanation:"Bottom-left orange is isolated"},{input:"grid = [[0,2]]",output:"0",explanation:"No fresh oranges to begin with"}],constraints:["m == grid.length","n == grid[i].length","1 \u2264 m, n \u2264 10","grid[i][j] is 0, 1, or 2"],hint:'Rotting spreads from every rotten orange simultaneously. What BFS strategy starts from multiple sources at the same time? How do you track that one BFS "level" equals one minute?',solutions:[Dn]};var Bn=`from typing import List


class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        # two pointers both start at the left to preserve relative order of non-zeros
        # left = next write slot for a non-zero value; right = current element being examined
        # (opposite-end pointers would not preserve order)
        def swap(l, r):
            temp = nums[l]
            nums[l] = nums[r]
            nums[r] = temp

        left = right = 0
        while right < len(nums):
            if nums[right] != 0:
                swap(left, right)
                left += 1
            right += 1`;function Hn(){let i=[0,1,0,3,12],u=[],r=(t,a)=>i.map((e,o)=>({value:e,state:o<t?"found":o===t&&o===a?"active":o===t?"min-ptr":o===a?"active":"default"})),s=(t,a)=>t===a?[{index:t,label:"l=r"}]:[{index:t,label:"l"},{index:a,label:"r"}];u.push({explanation:"Move all 0s to the end while preserving the order of non-zeros. Two pointers: left is the next write slot for a non-zero; right scans every element.",highlightLine:6,state:{type:"array",cells:r(0,0),pointers:s(0,0)},variables:[{name:"left",value:0},{name:"right",value:0}]});let n=0;for(let t=0;t<i.length;t++)i[t]!==0?(u.push({explanation:`nums[${t}] = ${i[t]} is non-zero. Swap it into position left=${n}.`,highlightLine:9,state:{type:"array",cells:r(n,t),pointers:s(n,t)},variables:[{name:"left",value:n},{name:"right",value:t,highlight:!0},{name:"nums[right]",value:i[t],highlight:!0}]}),[i[n],i[t]]=[i[t],i[n]],n++,u.push({explanation:`Swapped. ${i[n-1]} is now locked at index ${n-1}. left advances to ${n}.`,highlightLine:10,state:{type:"array",cells:r(n,t),pointers:s(n,t)},variables:[{name:"left",value:n,highlight:!0},{name:"right",value:t}]})):u.push({explanation:`nums[${t}] = 0. Nothing to write \u2014 left stays at ${n}, right advances.`,highlightLine:8,state:{type:"array",cells:r(n,t),pointers:s(n,t)},variables:[{name:"left",value:n},{name:"right",value:t,highlight:!0},{name:"nums[right]",value:0}]});return u.push({explanation:`Done. [${i.join(", ")}] \u2014 all non-zeros in original order, zeros at the end. O(n) time, O(1) space.`,highlightLine:11,state:{type:"array",cells:i.map(t=>({value:t,state:t===0?"eliminated":"found"})),pointers:[]},variables:[{name:"left",value:n},{name:"right",value:i.length}]}),u}var _n={label:"Two Pointers",pythonCode:Bn,generateSteps:Hn},Be={id:"move-zeros",lcNumber:283,title:"Move Zeroes",difficulty:"Easy",category:"two-pointers",tags:["Array","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums, move all 0s to the end of it while maintaining the relative order of the non-zero elements. You must do this in-place without making a copy of the array.",examples:[{input:"nums = [0, 1, 0, 3, 12]",output:"[1, 3, 12, 0, 0]"},{input:"nums = [0]",output:"[0]"}],constraints:["1 \u2264 nums.length \u2264 10\u2074","-2\xB3\xB9 \u2264 nums[i] \u2264 2\xB3\xB9 \u2212 1"],hint:"Two pointers: left tracks the next slot where a non-zero should go. right scans forward. When right finds a non-zero, swap it to left and advance both.",solutions:[_n]};var Wn=`class Solution:
    def isPalindrome(self, s: str) -> bool:
        # clean string to alphabet only
        # also make it lowercase
        regex = re.compile('[^a-zA-Z]')
        cleanString = regex.sub('', s).lower()

        l,r=0,len(cleanString)-1
        while r>=l:
            if cleanString[l] != cleanString[r]:
                return False
            l+=1
            r-=1
        return True`,zn=`class Solution:
    def isPalindromeNoCleaning(self, s: str) -> bool:

        def alphaNumeric(character):
            return ((ord('A') <= ord(character) <= ord('Z')) or
                    (ord('a') <= ord(character) <= ord('z')) or
                    (ord('0') <= ord(character) <= ord('9'))
                    )

        l, r = 0, len(s) - 1

        while r >= l:
            # get to alphanumeric for both l and r
            while l < r and not alphaNumeric(s[l]):
                l+=1
            while r > l and not alphaNumeric(s[r]):
                r-=1
            if s[r].lower() != s[l].lower():
                return False
            r-=1
            l+=1
        return True`;function Yn(){let u="racecar".split(""),r=[],s=(a,e,o=!1)=>u.map((l,h)=>({value:l,state:o?"found":h<a||h>e?"visited":h===a||h===e?"active":"default"}));r.push({explanation:'Filter out non-alphanumeric characters and lowercase everything. For "racecar" the filtered array is the string itself. Then place two pointers: l at the left end, r at the right end.',highlightLine:3,state:{type:"array",cells:u.map(a=>({value:a,state:"default"})),pointers:[{index:0,label:"l"},{index:u.length-1,label:"r"}]},variables:[{name:"l",value:0},{name:"r",value:u.length-1}]});let n=0,t=u.length-1;for(;n<t;){let a=u[n]===u[t];if(r.push({explanation:a?`filtered[${n}] = '${u[n]}' and filtered[${t}] = '${u[t]}' match. Shrink the window: l++, r--.`:`filtered[${n}] = '${u[n]}' and filtered[${t}] = '${u[t]}' do NOT match. Return false immediately.`,highlightLine:a?8:7,state:{type:"array",cells:s(n,t,!a),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n,highlight:!0},{name:"r",value:t,highlight:!0},{name:"filtered[l]",value:u[n]},{name:"filtered[r]",value:u[t]},{name:"match",value:a?"yes":"NO \u2192 false",highlight:!a}]}),!a)return r;n++,t--}return r.push({explanation:`l (${n}) \u2265 r (${t}) \u2014 every pair matched. Return true. "racecar" is a palindrome.`,highlightLine:10,state:{type:"array",cells:u.map(a=>({value:a,state:"found"})),pointers:[{index:n,label:"l=r"}]},variables:[{name:"l",value:n},{name:"r",value:t},{name:"result",value:"true",highlight:!0}]}),r}function Gn(){let i="Race, car".split(""),u=[],r=l=>/[a-z0-9]/i.test(l),s=new Set,n=new Set,t=(l,h,d=!1)=>i.map((c,p)=>({value:c,state:d?r(c)?"found":"eliminated":n.has(p)?"eliminated":p===l||p===h?"active":s.has(p)?"visited":"default"}));u.push({explanation:"This version never builds a cleaned copy of the string \u2014 it saves that O(n) extra space by skipping non-alphanumeric characters on the fly. Two pointers start at the ends; before each comparison we slide each pointer inward past any punctuation or spaces.",highlightLine:10,state:{type:"array",cells:t(0,i.length-1),pointers:[{index:0,label:"l"},{index:i.length-1,label:"r"}]},variables:[{name:"l",value:0},{name:"r",value:i.length-1}]});let a=0,e=i.length-1,o=!0;for(;e>=a;){for(;a<e&&!r(i[a]);)n.add(a),u.push({explanation:`Left pointer: s[${a}] = '${i[a]}' is NOT alphanumeric, so skip it (l++). We don't compare punctuation.`,highlightLine:15,state:{type:"array",cells:t(a,e),pointers:[{index:a,label:"l"},{index:e,label:"r"}]},variables:[{name:"l",value:a,highlight:!0},{name:"s[l]",value:`'${i[a]}'`},{name:"alphanumeric?",value:"no \u2192 skip"}]}),a++;for(;e>a&&!r(i[e]);)n.add(e),u.push({explanation:`Right pointer: s[${e}] = '${i[e]}' is NOT alphanumeric, so skip it (r--).`,highlightLine:17,state:{type:"array",cells:t(a,e),pointers:[{index:a,label:"l"},{index:e,label:"r"}]},variables:[{name:"r",value:e,highlight:!0},{name:"s[r]",value:`'${i[e]}'`},{name:"alphanumeric?",value:"no \u2192 skip"}]}),e--;let l=i[a].toLowerCase(),h=i[e].toLowerCase(),d=l===h;if(u.push({explanation:d?`Both alphanumeric now. Compare s[${a}]\u2192'${l}' vs s[${e}]\u2192'${h}' (lowercased): they match. Move both pointers inward (l++, r--).`:`Compare s[${a}]\u2192'${l}' vs s[${e}]\u2192'${h}' (lowercased): they do NOT match. Return False immediately.`,highlightLine:d?21:19,state:{type:"array",cells:t(a,e),pointers:[{index:a,label:"l"},{index:e,label:"r"}]},variables:[{name:"l",value:a},{name:"r",value:e},{name:"s[l].lower()",value:`'${l}'`},{name:"s[r].lower()",value:`'${h}'`},{name:"match",value:d?"yes":"NO \u2192 False",highlight:!0}]}),!d){o=!1;break}a!==e&&(s.add(a),s.add(e)),a++,e--}return u.push({explanation:o?`r (${e}) < l (${a}) \u2014 the pointers crossed and every alphanumeric pair matched. Return True. Same answer as the cleaning version, but O(1) extra space.`:"Returned False above \u2014 not a palindrome.",highlightLine:22,state:{type:"array",cells:t(a,e,o),pointers:[]},variables:[{name:"result",value:String(o),highlight:!0}]}),u}var Vn={label:"Two Pointers",pythonCode:Wn,generateSteps:Yn},Un={label:"No Cleaning",pythonCode:zn,generateSteps:Gn},He={id:"valid-palindrome",lcNumber:125,title:"Valid Palindrome",difficulty:"Easy",category:"two-pointers",tags:["Two Pointers","String"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.",examples:[{input:'s = "A man, a plan, a canal: Panama"',output:"true",explanation:'"amanaplanacanalpanama" is a palindrome.'},{input:'s = "race a car"',output:"false",explanation:'"raceacar" is not a palindrome.'}],constraints:["1 \u2264 s.length \u2264 2 \xD7 10\u2075","s consists only of printable ASCII characters."],hint:"Filter the string first, then use two pointers that start at each end and converge. If any pair doesn't match, return false immediately.",solutions:[Vn,Un]};var Xn=`class Solution:
    def validPalindrome(self, s: str) -> bool:
        # two pointers converge inward; on a mismatch we get one deletion attempt
        # try skipping the left character or skipping the right \u2014 either may yield a palindrome
        l, r = 0, len(s) - 1

        def skippable(l, r) -> bool:
            while l < r:
                if s[l] == s[r]:
                    l += 1
                    r -= 1
                else:
                    return False
            return True

        while l < r:
            if s[l] == s[r]:
                l += 1
                r -= 1
            else:
                return skippable(l+1, r) or skippable(l, r-1)

        return True`;function Kn(){let i="eccer",u=i.split(""),r=[],s=(a,e,o={})=>u.map((l,h)=>({value:l,state:o[h]??(h===a||h===e?"active":h<a||h>e?"visited":"default")}));r.push({explanation:"Two pointers approach with one allowed deletion. Start with l at the left and r at the right. Advance both as long as characters match. On a mismatch, try skipping either side and check if the remaining substring is a palindrome.",highlightLine:11,state:{type:"array",cells:u.map(a=>({value:a,state:"default"})),pointers:[{index:0,label:"l"},{index:u.length-1,label:"r"}]},variables:[{name:"l",value:0},{name:"r",value:u.length-1},{name:"s",value:i}]});let n=0,t=u.length-1;r.push({explanation:`s[${n}]='${u[n]}' != s[${t}]='${u[t]}': mismatch on first comparison! Try skipping the left (check s[${n+1}..${t}]) OR skipping the right (check s[${n}..${t-1}]).`,highlightLine:16,state:{type:"array",cells:s(n,t),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n,highlight:!0},{name:"r",value:t,highlight:!0},{name:"s[l]",value:u[n]},{name:"s[r]",value:u[t]}]});{let a=n+1,e=t;r.push({explanation:`Branch A: skip left \u2192 check s[${a}..${e}] = "${i.slice(a,e+1)}". s[${a}]='${u[a]}' vs s[${e}]='${u[e]}' \u2014 mismatch. Branch A fails.`,highlightLine:4,state:{type:"array",cells:u.map((o,l)=>({value:o,state:l===n?"eliminated":l===a||l===e?"active":l>a&&l<e?"default":"visited"})),pointers:[{index:a,label:"l+1"},{index:e,label:"r"}]},variables:[{name:"branch",value:"skip left"},{name:`s[${a}]`,value:u[a]},{name:`s[${e}]`,value:u[e]},{name:"match",value:"false"}]})}{let a=n,e=t-1;r.push({explanation:`Branch B: skip right \u2192 check s[${a}..${e}] = "${i.slice(a,e+1)}". Begin inner check.`,highlightLine:4,state:{type:"array",cells:u.map((l,h)=>({value:l,state:h===t?"eliminated":h===a||h===e?"active":h>a&&h<e?"default":"visited"})),pointers:[{index:a,label:"l"},{index:e,label:"r-1"}]},variables:[{name:"branch",value:"skip right"},{name:`s[${a}]`,value:u[a]},{name:`s[${e}]`,value:u[e]}]}),r.push({explanation:`s[${a}]='${u[a]}' == s[${e}]='${u[e]}' \u2713 \u2014 advance inward.`,highlightLine:5,state:{type:"array",cells:u.map((l,h)=>({value:l,state:h===t?"eliminated":h===a||h===e?"found":h>a&&h<e?"default":"visited"})),pointers:[{index:a,label:"l"},{index:e,label:"r"}]},variables:[{name:`s[${a}]`,value:u[a]},{name:`s[${e}]`,value:u[e]},{name:"match",value:"true"}]});let o=a+1;e=e-1,r.push({explanation:`s[${o}]='${u[o]}' == s[${e}]='${u[e]}' \u2713 \u2014 advance inward again.`,highlightLine:18,state:{type:"array",cells:u.map((l,h)=>({value:l,state:h===t||h===a||h===e+1?"visited":h===o||h===e?"found":"visited"})),pointers:[{index:o,label:"l"},{index:e,label:"r"}]},variables:[{name:`s[${o}]`,value:u[o]},{name:`s[${e}]`,value:u[e]},{name:"match",value:"true"}]}),r.push({explanation:`l(${o+1}) >= r(${e-1}): inner loop exits. Substring "${i.slice(a,t)}" is a palindrome \u2014 we can delete '${u[t]}' at index ${t}. Return true.`,highlightLine:9,state:{type:"array",cells:u.map((l,h)=>({value:l,state:h===t?"eliminated":"found"})),pointers:[]},variables:[{name:"skippable",value:"true",highlight:!0},{name:"return",value:"true",highlight:!0}]})}return r}var Qn={label:"Two Pointers",pythonCode:Xn,generateSteps:Kn},_e={id:"valid-palindrome-ii",lcNumber:680,title:"Valid Palindrome II",difficulty:"Easy",category:"two-pointers",tags:["Two Pointers","String","Greedy"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given a string s, return true if the s can be palindrome after deleting at most one character from it.",examples:[{input:'s = "aba"',output:"true"},{input:'s = "abca"',output:"true",explanation:"You could delete the character 'c'."},{input:'s = "abc"',output:"false"}],constraints:["1 \u2264 s.length \u2264 10\u2075","s consists of lowercase English letters."],hint:"Move two pointers inward while characters match. On the first mismatch, you must delete either the left or right character. Check both: if either resulting substring is a palindrome, return true.",solutions:[Qn]};var Jn=`class Solution:
    def trap(self, height: List[int]) -> int:
        # knowing water at each index = min(leftMax, rightMax) - height[i]
        # we need to keep track of leftMax and rightMax of each index
        # leftMax and rightMax stands for the walls for which this current index
        # can trap water

        # height   = [0,1,0,2,1,0,1,3,2,1,2,1]
        # leftMax  = [0,0,1,1,2,2,2,2,3,3,3,3]
        # rightMax = [3,3,3,3,3,3,3,2,2,2,1,0]
        # water    = [0,0,1,0,1,2,1,0,0,1,0,0]

        leftMax = [0] * len(height)
        rightMax = [0] * len(height)
        totalWater = 0

        for i in range(1, len(height)):
            leftMax[i] = max(leftMax[i-1], height[i-1])

        for i in range(len(height)-2, -1, -1):
            rightMax[i] = max(rightMax[i+1], height[i+1])

        for i in range(len(height)):
            currentWater = max(0, min(leftMax[i], rightMax[i]) - height[i])
            totalWater += currentWater

        return totalWater`,Zn=`class Solution:
    def trap(self, height: List[int]) -> int:
        # water[i] = min(leftMax, rightMax) - height[i]; the smaller side is the bottleneck
        # two pointers: always process the side whose max is smaller \u2014 that side's max is the true potential water
        # this lets us compute the running max from each side without storing full leftMax/rightMax arrays

        if not height:
            return 0

        l, r = 0, len(height) - 1
        leftMax, rightMax = height[l], height[r]
        res = 0
        while l < r:
            if leftMax < rightMax:
                l += 1                             # move inward \u2014 boundary cells themselves hold no water
                leftMax = max(leftMax, height[l])  # update running max from the left
                res += leftMax - height[l]         # potential water - actual height = trapped water
            else:
                r -= 1
                rightMax = max(rightMax, height[r])
                res += rightMax - height[r]
        return res`;function ei(){let i=[0,1,0,2,1,0,2,1],u=i.length,r=Array(u).fill(0),s=Array(u).fill(0),n=[];n.push({explanation:"Water at index i = min(leftMax[i], rightMax[i]) \u2212 height[i], where leftMax[i] is the tallest wall to the left and rightMax[i] to the right. Build both arrays in two passes, then compute water in a third.",highlightLine:2,state:{type:"array",cells:i.map(e=>({value:e,state:"default"})),pointers:[],counters:[{label:"leftMax",value:`[${r.join(", ")}]`},{label:"rightMax",value:`[${s.join(", ")}]`}]},variables:[{name:"height",value:`[${i.join(", ")}]`}]});for(let e=1;e<u;e++)r[e]=Math.max(r[e-1],i[e-1]),n.push({explanation:`leftMax[${e}] = max(leftMax[${e-1}]=${r[e-1]}, height[${e-1}]=${i[e-1]}) = ${r[e]}.`,highlightLine:6,state:{type:"array",cells:r.map((o,l)=>({value:o,state:l===e?"active":l<e?"visited":"default"})),pointers:[{index:e,label:"i"}],counters:[{label:"height",value:`[${i.join(", ")}]`},{label:"rightMax",value:`[${s.join(", ")}]`}]},variables:[{name:"i",value:e},{name:`leftMax[${e}]`,value:r[e],highlight:!0}]});for(let e=u-2;e>=0;e--)s[e]=Math.max(s[e+1],i[e+1]),n.push({explanation:`rightMax[${e}] = max(rightMax[${e+1}]=${s[e+1]}, height[${e+1}]=${i[e+1]}) = ${s[e]}.`,highlightLine:8,state:{type:"array",cells:s.map((o,l)=>({value:o,state:l===e?"active":l>e?"visited":"default"})),pointers:[{index:e,label:"i"}],counters:[{label:"height",value:`[${i.join(", ")}]`},{label:"leftMax",value:`[${r.join(", ")}]`}]},variables:[{name:"i",value:e},{name:`rightMax[${e}]`,value:s[e],highlight:!0}]});let t=0,a=Array(u).fill(0);for(let e=0;e<u;e++)a[e]=Math.max(0,Math.min(r[e],s[e])-i[e]),t+=a[e],n.push({explanation:`i=${e}: min(leftMax=${r[e]}, rightMax=${s[e]}) \u2212 height=${i[e]} = ${a[e]} unit${a[e]!==1?"s":""} of water. Running total: ${t}.`,highlightLine:11,state:{type:"array",cells:i.map((o,l)=>({value:l<=e?a[l]:o,state:l<e?a[l]>0?"found":"visited":l===e?"active":"default"})),pointers:[{index:e,label:"i"}],counters:[{label:"leftMax",value:`[${r.join(", ")}]`},{label:"rightMax",value:`[${s.join(", ")}]`},{label:"total",value:t}]},variables:[{name:"i",value:e},{name:`water[${e}]`,value:a[e],highlight:!0},{name:"total",value:t,highlight:!0}]});return n.push({explanation:`Total trapped water = ${t}. O(n) time, O(n) space for the two auxiliary arrays.`,highlightLine:12,state:{type:"array",cells:a.map(e=>({value:e,state:e>0?"found":"eliminated"})),pointers:[],counters:[{label:"leftMax",value:`[${r.join(", ")}]`},{label:"rightMax",value:`[${s.join(", ")}]`},{label:"total",value:t}]},variables:[{name:"return",value:t,highlight:!0}]}),n}function ti(){let i=[0,1,0,2,1,0,2,1],u=[],r=0,s=i.length-1,n=i[r],t=i[s],a=0;for(u.push({explanation:"Key insight: water at i is bounded by the shorter wall. We only need the running max from each side, not the full arrays. Two pointers l and r move inward \u2014 always process the side with the smaller max, since that side is the bottleneck.",highlightLine:3,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o===r?"active":o===s?"min-ptr":"default"})),pointers:[{index:r,label:"l"},{index:s,label:"r"}],counters:[{label:"leftMax",value:n},{label:"rightMax",value:t},{label:"res",value:a}]},variables:[{name:"l",value:r},{name:"r",value:s},{name:"leftMax",value:n},{name:"rightMax",value:t}]});r<s;)n<t?(r++,n=Math.max(n,i[r]),a+=n-i[r],u.push({explanation:`leftMax(${n}) < rightMax(${t}): left side is bottleneck. Move l to ${r}. leftMax=max(${n},${i[r]})=${n}. water += ${n}-${i[r]}=${n-i[r]}. res=${a}.`,highlightLine:8,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o<r?"visited":o===r?"active":o===s?"min-ptr":o>s?"visited":"default"})),pointers:[{index:r,label:"l"},{index:s,label:"r"}],counters:[{label:"leftMax",value:n},{label:"rightMax",value:t},{label:"res",value:a}]},variables:[{name:"l",value:r,highlight:!0},{name:"leftMax",value:n,highlight:!0},{name:"water",value:n-i[r]},{name:"res",value:a,highlight:!0}]})):(s--,t=Math.max(t,i[s]),a+=t-i[s],u.push({explanation:`leftMax(${n}) >= rightMax(${t}): right side is bottleneck. Move r to ${s}. rightMax=max(${t},${i[s]})=${t}. water += ${t}-${i[s]}=${t-i[s]}. res=${a}.`,highlightLine:11,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o<r?"visited":o===r?"active":o===s?"min-ptr":o>s?"visited":"default"})),pointers:[{index:r,label:"l"},{index:s,label:"r"}],counters:[{label:"leftMax",value:n},{label:"rightMax",value:t},{label:"res",value:a}]},variables:[{name:"r",value:s,highlight:!0},{name:"rightMax",value:t,highlight:!0},{name:"water",value:t-i[s]},{name:"res",value:a,highlight:!0}]}));return u.push({explanation:`l(${r}) meets r(${s}) \u2014 done. Total = ${a}. O(n) time, O(1) space \u2014 no auxiliary arrays needed.`,highlightLine:13,state:{type:"array",cells:i.map((e,o)=>({value:i[o],state:"found"})),pointers:[{index:r,label:"l=r"}],counters:[{label:"leftMax",value:n},{label:"rightMax",value:t},{label:"res",value:a}]},variables:[{name:"return",value:a,highlight:!0}]}),u}var ai={label:"Prefix Arrays",pythonCode:Jn,generateSteps:ei},ni={label:"Two Pointers",pythonCode:Zn,generateSteps:ti},We={id:"trapping-rain-water",lcNumber:42,title:"Trapping Rain Water",difficulty:"Hard",category:"two-pointers",tags:["Array","Two Pointers","Dynamic Programming"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",examples:[{input:"height = [0,1,0,2,1,0,1,3,2,1,2,1]",output:"6",explanation:"The elevation map traps 6 units of rain water."},{input:"height = [4,2,0,3,2,5]",output:"9"}],constraints:["n == height.length","1 \u2264 n \u2264 2 \xD7 10\u2074","0 \u2264 height[i] \u2264 10\u2075"],hint:"Water at index i = min(max height to its left, max height to its right) \u2212 height[i]. Precompute those maxes in two arrays (O(n) space), or use two pointers to eliminate the arrays entirely (O(1) space).",solutions:[ai,ni]};var ii=`class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        # sort first so we can use two pointers for the inner pair
        # fix nums[i] as the anchor; then find j and k in the remaining subarray such that nums[j] + nums[k] = -nums[i]
        threeSumSet = set()
        nums.sort()
        for i in range(len(nums)):
            j = i + 1
            k = len(nums) - 1
            while j < k:
                # sorted array lets us steer: sum > 0 \u2192 move k left (reduce); sum < 0 \u2192 move j right (increase)
                if nums[i] + nums[j] + nums[k] == 0:
                    solution = (nums[i], nums[j], nums[k])
                    threeSumSet.add(solution)
                    # advance both pointers \u2014 this pair is consumed, look for the next distinct pair
                    j += 1
                    k -= 1
                elif nums[i] + nums[j] + nums[k] > 0:
                    k -= 1
                else:
                    j += 1
        return list(threeSumSet)`;function si(){let i=[-1,0,1,2,-1,-4],u=[...i].sort((a,e)=>a-e),r=u.length,s=[],n=[],t=(a,e,o)=>u.map((l,h)=>({value:l,state:h===a?"found":h===e?"active":h===o?"min-ptr":h<a?"visited":"default"}));s.push({explanation:`Sort first: [${i.join(", ")}] \u2192 [${u.join(", ")}]. Sorting lets us use a two-pointer search for the inner pair. Fix i (outer element), then use j (left) and k (right) to find two elements that sum to -nums[i].`,highlightLine:3,state:{type:"array",cells:u.map(a=>({value:a,state:"default"})),pointers:[]},variables:[{name:"sorted",value:`[${u.join(", ")}]`}]});for(let a=0;a<r-2;a++){if(a>0&&u[a]===u[a-1]){s.push({explanation:`i=${a}: nums[${a}]=${u[a]} is the same as nums[${a-1}]=${u[a-1]}. Skip to avoid duplicate triplets.`,highlightLine:5,state:{type:"array",cells:u.map((l,h)=>({value:l,state:h<=a?"visited":"default"})),pointers:[{index:a,label:"i (skip)"}],counters:n.length>0?[{label:"found",value:n.join(", ")}]:[]},variables:[{name:"i",value:a},{name:"skip duplicate",value:u[a]}]});continue}let e=a+1,o=r-1;for(s.push({explanation:`i=${a}: nums[i]=${u[a]}. Set j=${e} (left of remaining) and k=${o} (right). Looking for nums[j]+nums[k] = ${-u[a]}.`,highlightLine:6,state:{type:"array",cells:t(a,e,o),pointers:[{index:a,label:"i"},{index:e,label:"j"},{index:o,label:"k"}],counters:n.length>0?[{label:"found",value:n.join(", ")}]:[]},variables:[{name:"i",value:a},{name:"nums[i]",value:u[a]},{name:"target",value:-u[a]}]});e<o;){let l=u[a]+u[e]+u[o];if(l===0){let h=`[${u[a]},${u[e]},${u[o]}]`;n.push(h),s.push({explanation:`nums[${a}]+nums[${e}]+nums[${o}] = ${u[a]}+${u[e]}+${u[o]} = 0 \u2713 Found triplet ${h}! Advance both j and k.`,highlightLine:9,state:{type:"array",cells:u.map((d,c)=>({value:d,state:c===a||c===e||c===o?"found":c<a?"visited":"default"})),pointers:[{index:a,label:"i"},{index:e,label:"j"},{index:o,label:"k"}],counters:[{label:"found",value:n.join(", ")}]},variables:[{name:"sum",value:l,highlight:!0},{name:"triplet",value:h,highlight:!0}]}),e++,o--}else l>0?(s.push({explanation:`sum=${l} > 0. Too large \u2014 move k left to reduce the sum.`,highlightLine:13,state:{type:"array",cells:t(a,e,o),pointers:[{index:a,label:"i"},{index:e,label:"j"},{index:o,label:"k"}],counters:n.length>0?[{label:"found",value:n.join(", ")}]:[]},variables:[{name:"sum",value:l,highlight:!0},{name:"action",value:"k--"}]}),o--):(s.push({explanation:`sum=${l} < 0. Too small \u2014 move j right to increase the sum.`,highlightLine:15,state:{type:"array",cells:t(a,e,o),pointers:[{index:a,label:"i"},{index:e,label:"j"},{index:o,label:"k"}],counters:n.length>0?[{label:"found",value:n.join(", ")}]:[]},variables:[{name:"sum",value:l,highlight:!0},{name:"action",value:"j++"}]}),e++)}}return s.push({explanation:`All outer values processed. Result: ${n.join(", ")}. O(n\xB2) time (sorting + two-pointer scan per outer element), O(n) space for output.`,highlightLine:16,state:{type:"array",cells:u.map(a=>({value:a,state:"visited"})),pointers:[],counters:[{label:"result",value:n.join(", ")}]},variables:[{name:"return",value:n.join(", "),highlight:!0}]}),s}var ri={label:"Sort + Two Pointers",pythonCode:ii,generateSteps:si},ze={id:"three-sum",lcNumber:15,title:"3Sum",difficulty:"Medium",category:"two-pointers",tags:["Array","Two Pointers","Sorting"],timeComplexity:"O(n\xB2)",spaceComplexity:"O(n)",description:"Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i, j, and k are distinct indices, nums[i] + nums[j] + nums[k] == 0, and the solution set contains no duplicate triplets.",examples:[{input:"nums = [-1,0,1,2,-1,-4]",output:"[[-1,-1,2],[-1,0,1]]"},{input:"nums = [0,1,1]",output:"[]"},{input:"nums = [0,0,0]",output:"[[0,0,0]]"}],constraints:["3 \u2264 nums.length \u2264 3000","-10\u2075 \u2264 nums[i] \u2264 10\u2075"],hint:'Sort the array. For each element nums[i] (the "anchor"), reduce the problem to two-sum on the sorted subarray to the right. Two pointers j and k move inward, adjusting based on whether the current sum is too small or too large.',solutions:[ri]};var li=`from typing import List


class Solution:
    def maxSubArrayKadane(self, nums: List[int]) -> int:
        # constant space dynamic sliding window algorithm
        # we can be greedy and not care for negative sums
        # e.g. if current sum is negative, discard it, start back at 0 at current index

        # start maxSum at first index
        # it should not be 0 since we have negatives
        # e.g. if result is negative and we start at 0, 0 will always be bigger and we will return 0 if we initialize to 0

        maxSum = nums[0]
        curMax = 0

        for n in nums:
            if curMax < 0:
                curMax = 0
            curMax += n
            maxSum = max(maxSum, curMax)

        return maxSum`;function oi(){let i=[-2,1,-3,4,-1,2,1,-5,4],u=[],r=i[0],s=0,n=0,t=0,a=0,e=(o,l,h,d)=>i.map((c,p)=>({value:c,state:p===o?"active":p>=l&&p<o?"window":p>=h&&p<=d&&p<l?"found":"default"}));u.push({explanation:"Kadane's algorithm: greedily extend the current subarray. If curMax ever goes negative, discard it \u2014 a negative prefix only drags down future sums. maxSum tracks the best seen so far.",highlightLine:6,state:{type:"array",cells:i.map(o=>({value:o,state:"default"})),pointers:[],counters:[{label:"maxSum",value:r},{label:"curMax",value:s}]},variables:[{name:"maxSum",value:r},{name:"curMax",value:s}]});for(let o=0;o<i.length;o++){let l=i[o],h=s<0;h&&(n=o,s=0),s+=l;let d=s>r;d?(r=s,t=n,a=o):r=Math.max(r,s),u.push({explanation:h?`curMax was negative \u2192 reset to 0. Now add n=${l}: curMax = ${s}. ${d?`New best: maxSum = ${r} (subarray ends at index ${o}).`:`maxSum stays ${r}.`}`:`Add n=${l} to curMax: ${s-l<0?"0":s-l} + ${l} = ${s}. ${d?`New best! maxSum = ${r}.`:`maxSum stays ${r}.`}`,highlightLine:h?11:12,state:{type:"array",cells:e(o,n,t,a),pointers:[{index:o,label:"n"}],counters:[{label:"maxSum",value:r},{label:"curMax",value:s}]},variables:[{name:"n",value:l,highlight:!0},{name:"curMax",value:s,highlight:!0},{name:"maxSum",value:r,highlight:d}]})}return u.push({explanation:`Maximum subarray sum is ${r}, from index ${t} to ${a}: [${i.slice(t,a+1).join(", ")}].`,highlightLine:15,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l>=t&&l<=a?"found":"default"})),pointers:[],counters:[{label:"maxSum",value:r},{label:"curMax",value:s}]},variables:[{name:"maxSum",value:r,highlight:!0}]}),u}var ui={label:"Kadane's",pythonCode:li,generateSteps:oi,timeComplexity:"O(n)",spaceComplexity:"O(1)"},hi=`from typing import List
import math


class Solution:
    def maxSubArrayPrefixSum(self, nums: List[int]) -> int:
        # finding subarray with largest sum
        # sliding window problem with dynamic window size
        # one approach is prefix sum
        # create prefixSum array
        # prefixSum[j] - prefixSum[i] = sum of subarray between i and j, exclusive of i
        # so we can keep track of a maximum sum
        # keep track of the smallest prefixSum[i] we can find
        # this way we maximize prefixSum[j] and minimize prefixSum[i]
        prefixSum = []
        for i in range(len(nums)):
            if i == 0:
                prefixSum.append(nums[i])
            else:
                prefixSum.append(nums[i] + prefixSum[i - 1])

        # needs to be 0 to calc subarray of size 1, e.g. [1]
        minPrefixSum = 0
        maxSum = -math.inf

        # nums = [-2,1,-3,4,-1,2,1,-5,4]
        # prefixSum = [-2, -1, -4, 0, -1, 1, 2, -3, 1]

        for curSum in prefixSum:
            maxSum = max(maxSum, curSum - minPrefixSum)
            minPrefixSum = min(minPrefixSum, curSum)
        return maxSum`;function di(){let i=[-2,1,-3,4,-1,2,1,-5,4],u=i.length,r=[],s=[];for(let a=0;a<u;a++)s.push(a===0?i[a]:i[a]+s[a-1]);r.push({explanation:"Prefix sum approach: build prefixSum[i] = nums[0]+\u2026+nums[i]. The best subarray ending at index i = prefixSum[i] \u2212 (min prefix seen before i). Track a running minimum to find this in one pass.",highlightLine:6,state:{type:"array",cells:i.map(a=>({value:a,state:"default"})),pointers:[],counters:[{label:"minPrefixSum",value:0},{label:"maxSum",value:"-\u221E"}]},variables:[{name:"nums",value:`[${i.join(", ")}]`},{name:"prefixSum",value:"[]"}]});for(let a=0;a<u;a++){let e=a===0?`i=0: prefixSum[0] = nums[0] = ${s[0]}. Base case.`:`i=${a}: prefixSum[${a}] = nums[${a}] + prefixSum[${a-1}] = ${i[a]} + ${s[a-1]} = ${s[a]}.`;r.push({explanation:e,highlightLine:a===0?9:11,state:{type:"array",cells:s.map((o,l)=>({value:o,state:l===a?"active":l<a?"visited":"default"})),pointers:[{index:a,label:"i"}],counters:[{label:"nums",value:`[${i.join(", ")}]`}]},variables:[{name:"i",value:a,highlight:!0},{name:`prefixSum[${a}]`,value:s[a],highlight:!0}]})}let n=0,t=-1/0;r.push({explanation:`prefixSum = [${s.join(", ")}]. Now scan it: for each value, candidate subarray sum = curSum \u2212 minPrefixSum (minimum prefix so far, starting at 0 to allow subarrays starting at index 0).`,highlightLine:14,state:{type:"array",cells:s.map(a=>({value:a,state:"default"})),pointers:[],counters:[{label:"minPrefixSum",value:n},{label:"maxSum",value:"-\u221E"}]},variables:[{name:"minPrefixSum",value:0},{name:"maxSum",value:"-\u221E"}]});for(let a=0;a<u;a++){let e=s[a],o=n,l=e-o,h=l>t;h&&(t=l),n=Math.min(n,e);let d=n<o;r.push({explanation:`curSum=${e}: candidate = ${e} \u2212 ${o} = ${l}. ${h?`New maxSum = ${t}!`:`maxSum stays ${t}.`}${d?` minPrefixSum \u2192 ${n}.`:""}`,highlightLine:18,state:{type:"array",cells:s.map((c,p)=>({value:c,state:p===a?"active":p<a?"visited":"default"})),pointers:[{index:a,label:"i"}],counters:[{label:"minPrefixSum",value:n},{label:"maxSum",value:t}]},variables:[{name:"curSum",value:e,highlight:!0},{name:"candidate",value:l,highlight:!0},{name:"maxSum",value:t,highlight:h},{name:"minPrefixSum",value:n,highlight:d}]})}return r.push({explanation:`maxSum = ${t}. Prefix sum uses O(n) space for the prefix array vs Kadane's O(1), but both are O(n) time. The prefix-sum pattern generalises to arbitrary subarray range queries.`,highlightLine:21,state:{type:"array",cells:s.map(a=>({value:a,state:"found"})),pointers:[],counters:[{label:"minPrefixSum",value:n},{label:"maxSum",value:t}]},variables:[{name:"maxSum",value:t,highlight:!0}]}),r}var ci={label:"Prefix Sum",pythonCode:hi,generateSteps:di,timeComplexity:"O(n)",spaceComplexity:"O(n)"},Ye={id:"maximum-subarray",lcNumber:53,title:"Maximum Subarray",difficulty:"Medium",category:"greedy",tags:["Array","Kadane's Algorithm","Dynamic Programming"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums, find the subarray with the largest sum, and return its sum.",examples:[{input:"nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",output:"6",explanation:"The subarray [4, -1, 2, 1] has the largest sum = 6."},{input:"nums = [1]",output:"1"},{input:"nums = [5, 4, -1, 7, 8]",output:"23"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","-10\u2074 \u2264 nums[i] \u2264 10\u2074"],hint:"If the current running sum ever goes negative, discard it and start fresh at the next element \u2014 a negative prefix can only hurt any subarray that extends it.",solutions:[ui,ci]};var pi=`class Solution:
    def sortColors(self, nums: List[int]) -> None:
        # Dutch National Flag: maintain three regions in a single pass
        # l = boundary of confirmed 0s, r = boundary of confirmed 2s, inc = current element
        #   if nums[inc] == 0: swap with l, advance both l and inc (0 region grows left)
        #   if nums[inc] == 1: just advance inc (already in the correct middle region)
        #   if nums[inc] == 2: swap with r, shrink r (don't advance inc \u2014 must re-inspect swapped value)
        def swap(l, r):
            temp = nums[l]
            nums[l] = nums[r]
            nums[r] = temp

        l, inc, r = 0, 0, len(nums) - 1
        while inc < len(nums):
            if nums[inc] == 0:
                swap(l, inc)
                l += 1
            elif nums[inc] == 2:
                swap(r, inc)
                r -= 1
                # the value swapped in from r is unknown \u2014 decrement inc so the next inc += 1 re-visits it
                inc -= 1
            inc += 1`,mi=`class Solution:
    def sortColors(self, nums: List[int]) -> None:
        # counting sort works here because values are bounded to {0, 1, 2}
        # count occurrences of each color, then overwrite the array in color order
        bucket = {}
        for num in nums:
            bucket[num] = 1 + bucket.get(num, 0)
        counter = 0
        for i in range(3):
            while bucket.get(i):
                nums[counter] = i
                bucket[i] = -1 + bucket.get(i, 0)
                counter += 1`;function gi(){let i=[2,0,2,1,1,0],u=[],r=(e,o,l)=>i.map((h,d)=>({value:h,state:d<e?"found":d>l?"eliminated":d===o?"active":d===e&&e!==o?"min-ptr":d===l&&l!==o?"max-ptr":"default"})),s=(e,o,l)=>{let h=[];return e===o&&e===l?h.push({index:e,label:"l=inc=r"}):e===o?(h.push({index:e,label:"l=inc"}),h.push({index:l,label:"r"})):o===l?(h.push({index:e,label:"l"}),h.push({index:o,label:"inc=r"})):(h.push({index:e,label:"l"}),h.push({index:o,label:"inc"}),h.push({index:l,label:"r"})),h},n=0,t=0,a=i.length-1;for(u.push({explanation:"Dutch National Flag: three regions \u2014 [0..l) are confirmed 0s (green), (r..n) are confirmed 2s (red), [l..inc) are confirmed 1s (middle), [inc..r] are unknown. inc scans forward; we place 0s left and 2s right.",highlightLine:3,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"l",value:n},{name:"inc",value:t},{name:"r",value:a}]});t<=a;){let e=i[t];e===0?(u.push({explanation:`nums[${t}]=0: swap with l=${n}. Grow the 0-region left boundary, advance both l and inc.`,highlightLine:5,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"nums[inc]",value:0,highlight:!0},{name:"action",value:"swap(l,inc), l++, inc++"}]}),[i[n],i[t]]=[i[t],i[n]],n++,t++,u.push({explanation:`After swap: nums[${n-1}]=${i[n-1]} locked as 0. l=${n}, inc=${t}.`,highlightLine:8,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"l",value:n,highlight:!0},{name:"inc",value:t}]})):e===2?(u.push({explanation:`nums[${t}]=2: swap with r=${a}. Shrink the 2-region. Do NOT advance inc \u2014 must re-check the swapped value.`,highlightLine:10,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"nums[inc]",value:2,highlight:!0},{name:"action",value:"swap(r,inc), r--"}]}),[i[a],i[t]]=[i[t],i[a]],a--,u.push({explanation:`After swap: nums[${a+1}]=${i[a+1]} locked as 2. r=${a}. inc stays at ${t} to recheck.`,highlightLine:12,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"r",value:a,highlight:!0},{name:"inc",value:t}]})):(u.push({explanation:`nums[${t}]=1: already in the middle region. Just advance inc.`,highlightLine:14,state:{type:"array",cells:r(n,t,a),pointers:s(n,t,a)},variables:[{name:"nums[inc]",value:1},{name:"action",value:"inc++"}]}),t++)}return u.push({explanation:`inc(${t}) > r(${a}): done. All elements sorted into three regions: 0s, 1s, 2s. O(n) time, O(1) space \u2014 single pass.`,highlightLine:4,state:{type:"array",cells:i.map(e=>({value:e,state:e===0?"found":e===2?"eliminated":"visited"})),pointers:[]},variables:[{name:"result",value:`[${i.join(", ")}]`,highlight:!0}]}),u}function fi(){let i=[2,0,2,1,1,0],u=[],r={};u.push({explanation:"Bucket / Counting Sort: count how many 0s, 1s, and 2s exist, then overwrite the array in order. Two passes, O(n) time, O(1) extra space (only 3 buckets).",highlightLine:3,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});for(let t=0;t<i.length;t++)r[i[t]]=(r[i[t]]??0)+1,u.push({explanation:`Count nums[${t}]=${i[t]}. bucket[${i[t]}] = ${r[i[t]]}.`,highlightLine:5,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===t?"active":e<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:y({},r)},variables:[{name:`bucket[${i[t]}]`,value:r[i[t]],highlight:!0}]});let s=[...i],n=0;for(let t=0;t<3;t++){let a=r[t]??0;for(let e=0;e<a;e++)s[n]=t,u.push({explanation:`Write color ${t} at index ${n}. ${a-e-1} more ${t}(s) to write.`,highlightLine:9,state:{type:"array",cells:s.map((o,l)=>({value:o,state:l<n?"found":l===n?"active":(l>n&&l<=n+(a-e-1)-1,"default")})),pointers:[{index:n,label:"counter"}],hashmap:y({},r)},variables:[{name:"color",value:t},{name:"counter",value:n,highlight:!0}]}),n++}return u.push({explanation:`Done. [${s.join(", ")}]. O(n) time \u2014 two passes. Works only because values are bounded (0,1,2).`,highlightLine:10,state:{type:"array",cells:s.map(t=>({value:t,state:t===0?"found":t===2?"eliminated":"visited"})),pointers:[]},variables:[{name:"result",value:`[${s.join(", ")}]`,highlight:!0}]}),u}var vi={label:"Dutch Flag",pythonCode:pi,generateSteps:gi},yi={label:"Bucket Sort",pythonCode:mi,generateSteps:fi},Ge={id:"sort-colors",lcNumber:75,title:"Sort Colors",difficulty:"Medium",category:"arrays-hash",tags:["Array","Two Pointers","Dutch Flag"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an array nums with n objects colored red, white, or blue (represented as 0, 1, and 2), sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue. You must solve this without using the built-in sort function.",examples:[{input:"nums = [2,0,2,1,1,0]",output:"[0,0,1,1,2,2]"},{input:"nums = [2,0,1]",output:"[0,1,2]"}],constraints:["n == nums.length","1 \u2264 n \u2264 300","nums[i] is either 0, 1, or 2."],hint:"Dutch National Flag: maintain three regions using l, inc, r. Elements before l are 0s, between l and inc are 1s, after r are 2s. inc scans forward \u2014 swap 0s to l, 2s to r. When swapping with r, do not advance inc (the incoming element needs inspection).",solutions:[vi,yi]};var bi=`class Solution:
    def rotate(self, nums: List[int], k: int) -> None:
        # three-reversal trick: reverse all \u2192 reverse first k \u2192 reverse last (n-k)
        # this repositions every element in O(n) time with O(1) space

        def reverseArray(l, r):
            def swap(l, r):
                temp = nums[l]
                nums[l] = nums[r]
                nums[r] = temp
            while r > l:
                swap(l, r)
                l += 1
                r -= 1
        # rotating by n is the same as no rotation, so reduce k to avoid redundant work
        k = k % len(nums)
        reverseArray(0, len(nums) - 1)
        reverseArray(0, k - 1)
        reverseArray(k, len(nums) - 1)`;function wi(){let i=[1,2,3,4,5,6,7],u=[...i],r=3,s=u.length,n=[],t=(e,o,l)=>u.map((h,d)=>({value:h,state:e.has(d)?"active":o.has(d)?"found":l&&d>=l[0]&&d<=l[1]?"window":"default"}));n.push({explanation:`Rotation by k=${r} on [${i.join(",")}]. Key insight: reverse all \u2192 reverse first k \u2192 reverse last n-k. This repositions every element in O(n) time with O(1) space.`,highlightLine:8,state:{type:"array",cells:u.map(e=>({value:e,state:"default"})),pointers:[]},variables:[{name:"k",value:r},{name:"n",value:s}]}),n.push({explanation:`Phase 1: reverse the entire array (indices 0..${s-1}).`,highlightLine:9,state:{type:"array",cells:t(new Set,new Set,[0,s-1]),pointers:[{index:0,label:"l"},{index:s-1,label:"r"}]},variables:[{name:"phase",value:"reverse all"}]});let a=(e,o,l,h)=>{let d=e,c=o;for(;d<c;){let p=new Set;for(let m=e;m<d;m++)p.add(m);for(let m=c+1;m<=o;m++)p.add(m);n.push({explanation:`${l}: swap nums[${d}]=${u[d]} \u2194 nums[${c}]=${u[c]}.`,highlightLine:h,state:{type:"array",cells:t(new Set([d,c]),p,[e,o]),pointers:[{index:d,label:"l"},{index:c,label:"r"}]},variables:[{name:"swap",value:`${u[d]} \u2194 ${u[c]}`,highlight:!0}]}),[u[d],u[c]]=[u[c],u[d]],d++,c--}};return a(0,s-1,"Phase 1",4),n.push({explanation:`After phase 1: [${u.join(",")}]. The whole array is flipped.`,highlightLine:9,state:{type:"array",cells:u.map(e=>({value:e,state:"visited"})),pointers:[]},variables:[{name:"array",value:`[${u.join(",")}]`}]}),n.push({explanation:`Phase 2: reverse first k=${r} elements (indices 0..${r-1}).`,highlightLine:10,state:{type:"array",cells:t(new Set,new Set,[0,r-1]),pointers:[{index:0,label:"l"},{index:r-1,label:"r"}]},variables:[{name:"phase",value:`reverse [0..${r-1}]`}]}),a(0,r-1,"Phase 2",4),n.push({explanation:`After phase 2: [${u.join(",")}]. First ${r} elements are now in rotated order.`,highlightLine:10,state:{type:"array",cells:u.map((e,o)=>({value:e,state:o<r?"found":"visited"})),pointers:[]},variables:[{name:"array",value:`[${u.join(",")}]`}]}),n.push({explanation:`Phase 3: reverse last n-k=${s-r} elements (indices ${r}..${s-1}).`,highlightLine:11,state:{type:"array",cells:t(new Set,new Set([...Array(r).keys()]),[r,s-1]),pointers:[{index:r,label:"l"},{index:s-1,label:"r"}]},variables:[{name:"phase",value:`reverse [${r}..${s-1}]`}]}),a(r,s-1,"Phase 3",4),n.push({explanation:`Done. [${u.join(",")}] = rotate([${i.join(",")}], k=${r}). Three reversals: O(n) time, O(1) space.`,highlightLine:11,state:{type:"array",cells:u.map(e=>({value:e,state:"found"})),pointers:[]},variables:[{name:"result",value:`[${u.join(",")}]`,highlight:!0}]}),n}var xi={label:"Three Reversals",pythonCode:bi,generateSteps:wi},Ve={id:"rotate-array",lcNumber:189,title:"Rotate Array",difficulty:"Medium",category:"arrays-hash",tags:["Array","Math","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums, rotate the array to the right by k steps, where k is non-negative. Do it in-place with O(1) extra space.",examples:[{input:"nums = [1,2,3,4,5,6,7], k = 3",output:"[5,6,7,1,2,3,4]",explanation:"Rotate 3 steps: [7,1,2,3,4,5,6] \u2192 [6,7,1,2,3,4,5] \u2192 [5,6,7,1,2,3,4]."},{input:"nums = [-1,-100,3,99], k = 2",output:"[3,99,-1,-100]"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","-2\xB3\xB9 \u2264 nums[i] \u2264 2\xB3\xB9 \u2212 1","0 \u2264 k \u2264 10\u2075"],hint:"Reverse the whole array, then reverse the first k elements, then reverse the remaining n-k elements. First reduce k = k % n to handle k > n.",solutions:[xi]};var $i=`import heapq

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        # frequency, so we should do a map
        # then we can keep a min heap of size k
        # return said heap's values
        freqMap = {}
        for n in nums:
            freqMap[n] = 1 + freqMap.get(n, 0)

        minHeap = []

        for key, value in freqMap.items():
            # need to do value, key since minHeap will compare on first value in tuple
            heapq.heappush(minHeap, (value, key))
            while len(minHeap) > k:
                heapq.heappop(minHeap)

        result = []
        for freq, key in minHeap:
            result.append(key)
        return result`;function ki(){let i=[1,1,1,2,2,3],u=2,r=[],s={};r.push({explanation:`Find the top ${u} most frequent elements in [${i.join(",")}]. Phase 1: build a frequency map. Phase 2: maintain a min-heap of size k \u2014 pop the least frequent when we exceed k, so only the top-k survive.`,highlightLine:4,state:{type:"array",cells:i.map(e=>({value:e,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"k",value:u}]});for(let e=0;e<i.length;e++)s[i[e]]=(s[i[e]]??0)+1,r.push({explanation:`freq[${i[e]}] = ${s[i[e]]}.`,highlightLine:6,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===e?"active":l<e?"visited":"default"})),pointers:[{index:e,label:"i"}],hashmap:y({},s)},variables:[{name:`freq[${i[e]}]`,value:s[i[e]],highlight:!0}]});let n=[],t=()=>n.map(([e,o])=>`(freq=${e},val=${o})`).join(", ");r.push({explanation:`Frequency map complete: {${Object.entries(s).map(([e,o])=>`${e}:${o}`).join(", ")}}. Now iterate over entries and maintain a min-heap of size k=${u}. The heap key is frequency \u2014 this lets us cheaply evict the least frequent element.`,highlightLine:9,state:{type:"array",cells:i.map(e=>({value:e,state:"visited"})),pointers:[],hashmap:y({},s),counters:[{label:"heap",value:"(empty)"}]},variables:[{name:"freq",value:`{${Object.entries(s).map(([e,o])=>`${e}:${o}`).join(", ")}}`}]});for(let[e,o]of Object.entries(s).map(([l,h])=>[Number(l),h]))if(n.push([o,e]),n.sort((l,h)=>l[0]-h[0]),r.push({explanation:`Push (freq=${o}, val=${e}) onto heap. Heap size = ${n.length}.`,highlightLine:16,state:{type:"array",cells:i.map(l=>({value:l,state:l===e?"active":"visited"})),pointers:[],hashmap:y({},s),counters:[{label:"heap (min first)",value:t()}]},variables:[{name:"pushed",value:`(freq=${o}, val=${e})`,highlight:!0},{name:"heap size",value:n.length}]}),n.length>u){let l=n.shift();r.push({explanation:`Heap size ${n.length+1} > k=${u}. Pop minimum: (freq=${l[0]}, val=${l[1]}) \u2014 val=${l[1]} is less frequent than our current top-k.`,highlightLine:18,state:{type:"array",cells:i.map(h=>({value:h,state:h===l[1]?"eliminated":"visited"})),pointers:[],hashmap:y({},s),counters:[{label:"heap (min first)",value:t()}]},variables:[{name:"popped",value:`val=${l[1]}`,highlight:!0},{name:"heap size",value:n.length}]})}let a=n.map(([,e])=>e);return r.push({explanation:`Heap contains the top-${u} most frequent: ${n.map(([e,o])=>`val=${o}(freq=${e})`).join(", ")}. Result: [${a.join(", ")}]. O(n log k) time.`,highlightLine:15,state:{type:"array",cells:i.map(e=>({value:e,state:a.includes(e)?"found":"eliminated"})),pointers:[],hashmap:y({},s),counters:[{label:"result",value:`[${a.join(", ")}]`}]},variables:[{name:"return",value:`[${a.join(", ")}]`,highlight:!0}]}),r}var Si={label:"HashMap + Min-Heap",pythonCode:$i,generateSteps:ki},Ue={id:"top-k-frequent-elements",lcNumber:347,title:"Top K Frequent Elements",difficulty:"Medium",category:"arrays-hash",tags:["Array","Hash Map","Bucket Sort","Heap"],timeComplexity:"O(n log k)",spaceComplexity:"O(n)",description:"Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",examples:[{input:"nums = [1,1,1,2,2,3], k = 2",output:"[1,2]"},{input:"nums = [1], k = 1",output:"[1]"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","-10\u2074 \u2264 nums[i] \u2264 10\u2074","k is in the range [1, the number of unique elements in the array].","It is guaranteed that the answer is unique."],hint:"Build a frequency map, then maintain a min-heap of size k keyed by frequency. Push every (freq, element) pair. When the heap exceeds size k, pop the minimum \u2014 this always evicts the least frequent element seen so far. What remains are the top-k.",solutions:[Si]};var Li=`class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        # only start counting from sequence beginnings to avoid O(n\xB2) inner loops
        # a number is a sequence start only if (num - 1) is not in the set
        # a set (not map) suffices \u2014 we only need membership checks, not stored lengths

        if not nums:
            return 0
        consecutiveSet = set(nums)
        longest = 0

        for num in consecutiveSet:
            if (num - 1) not in consecutiveSet:
                # this is a sequence start \u2014 extend forward until the chain breaks
                length = 1
                while (num + length) in consecutiveSet:
                    length += 1
                longest = max(longest, length)

        return longest`;function Oi(){let i=[100,4,200,1,3,2],u=new Set(i),r=[],s=0,n=()=>i.map(e=>({value:e,state:"default"})),t=(e,o)=>i.map(l=>({value:l,state:l===o?"active":e.includes(l)?"found":e.length>0&&i.indexOf(l)<i.indexOf(e[0])?"visited":"default"}));r.push({explanation:"Key insight: only start counting from sequence beginnings \u2014 a number is a start if (num \u2212 1) is not in the set. This avoids redundant inner loops and keeps overall complexity O(n).",highlightLine:3,state:{type:"array",cells:n(),pointers:[],hashmap:Object.fromEntries([...u].map(e=>[e,1]))},variables:[{name:"set",value:`{${[...u].sort((e,o)=>e-o).join(", ")}}`}]});let a=new Set;for(let e of u)if(u.has(e-1))a.add(e),r.push({explanation:`num=${e}: (${e}-1)=${e-1} IS in set \u2192 not a sequence start. Skip to avoid redundant work.`,highlightLine:5,state:{type:"array",cells:i.map(o=>({value:o,state:o===e?"eliminated":a.has(o)?"visited":"default"})),pointers:[],hashmap:Object.fromEntries([...u].map(o=>[o,1])),counters:[{label:"longest",value:s}]},variables:[{name:"num",value:e},{name:"is start",value:"false \u2014 skip"}]});else{let o=1,l=[e];for(r.push({explanation:`num=${e}: (${e}-1)=${e-1} not in set \u2192 this is a sequence start! Begin extending.`,highlightLine:5,state:{type:"array",cells:i.map(d=>({value:d,state:d===e?"active":a.has(d)?"visited":"default"})),pointers:[],hashmap:Object.fromEntries([...u].map(d=>[d,1])),counters:[{label:"longest",value:s}]},variables:[{name:"num",value:e,highlight:!0},{name:"is start",value:"true"},{name:"length",value:o}]});u.has(e+o);)l.push(e+o),o++,r.push({explanation:`${e+o-1} is in set \u2192 sequence extends to length ${o}. Current: [${l.join("\u2192")}].`,highlightLine:8,state:{type:"array",cells:i.map(d=>({value:d,state:l.includes(d)?"found":a.has(d)?"visited":"default"})),pointers:[],hashmap:Object.fromEntries([...u].map(d=>[d,1])),counters:[{label:"longest",value:s}]},variables:[{name:"num+length",value:e+o-1,highlight:!0},{name:"length",value:o,highlight:!0}]});let h=s;s=Math.max(s,o),l.forEach(d=>a.add(d)),r.push({explanation:`Sequence [${l.join("\u2192")}] has length ${o}. longest = max(${h}, ${o}) = ${s}.`,highlightLine:9,state:{type:"array",cells:i.map(d=>({value:d,state:l.includes(d)?"found":a.has(d)?"visited":"default"})),pointers:[],hashmap:Object.fromEntries([...u].map(d=>[d,1])),counters:[{label:"longest",value:s}]},variables:[{name:"length",value:o},{name:"longest",value:s,highlight:!0}]})}return r.push({explanation:`All elements checked. Longest consecutive sequence = ${s}. O(n) time \u2014 each element is visited at most twice (once as start check, once during extension).`,highlightLine:10,state:{type:"array",cells:i.map(e=>({value:e,state:"visited"})),pointers:[],counters:[{label:"longest",value:s}]},variables:[{name:"return",value:s,highlight:!0}]}),r}var Ci={label:"HashSet",pythonCode:Li,generateSteps:Oi},Mi=`class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        numSet = set(nums)
        numMap = {}
        longest = 0

        for n in numSet:
            # numMap[n-1] = length ending at n-1
            leftSequenceLength = numMap.get(n-1,0)
            # numMap[n+1] = length starting at n+1
            rightSequenceLength = numMap.get(n+1,0)
            # Add left sequence length, right sequence length and 1 for current value to get current sequence length
            numMap[n] = leftSequenceLength + rightSequenceLength + 1
            # set starting left sequence to new value
            numMap[n-leftSequenceLength] = numMap[n]
            # set ending right sequence to new value
            numMap[n+rightSequenceLength] = numMap[n]
            longest = max(longest, numMap[n])

        return longest`;function Ti(){let i=[100,4,200,1,3,2],u=[...new Set(i)],r=[],s={},n=0,t=a=>({type:"array",cells:i.map(e=>({value:e,state:e===a?"active":s[e]!==void 0?"visited":"default"})),pointers:a!==null?[{index:i.indexOf(a),label:"n"}]:[],hashmap:y({},s),hashmapLabel:"numMap",counters:[{label:"longest",value:n}]});r.push({explanation:"HashMap approach: numMap[x] stores the length of the consecutive run that has x as an ENDPOINT. For each value, glue its left run (ending at n\u22121) to its right run (starting at n+1), then write the merged length onto the two OUTER endpoints. O(n) \u2014 no per-run scanning.",highlightLine:3,state:t(null),variables:[{name:"numSet",value:`{${u.join(", ")}}`},{name:"longest",value:0}]});for(let a of u){let e=s[a-1]||0,o=s[a+1]||0,l=e+o+1;s[a]=l,s[a-e]=l,s[a+o]=l,n=Math.max(n,l),r.push({explanation:`n=${a}: left run ending at ${a-1} = ${e}, right run starting at ${a+1} = ${o}. Merge \u2192 numMap[${a}] = ${e}+${o}+1 = ${l}. Stamp that length onto the outer endpoints numMap[${a-e}] and numMap[${a+o}]. longest = ${n}.`,highlightLine:13,state:t(a),variables:[{name:"n",value:a,highlight:!0},{name:"left",value:e},{name:"right",value:o},{name:"numMap[n]",value:l,highlight:!0},{name:"longest",value:n,highlight:n===l}]})}return r.push({explanation:`All values processed. The longest run is ${n} \u2014 the 1\u20132\u20133\u20134 chain, assembled as 3 glued 2 (right run) and 2 glued 1 (left run). Return ${n}.`,highlightLine:20,state:t(null),variables:[{name:"return",value:n,highlight:!0}]}),r}var Ni={label:"HashMap (endpoint merge)",pythonCode:Mi,generateSteps:Ti},Xe={id:"longest-consecutive-sequence",lcNumber:128,title:"Longest Consecutive Sequence",difficulty:"Medium",category:"arrays-hash",tags:["Array","Hash Set","Hash Map"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.",examples:[{input:"nums = [100,4,200,1,3,2]",output:"4",explanation:"The longest consecutive sequence is [1,2,3,4] with length 4."},{input:"nums = [0,3,7,2,5,8,4,6,0,1]",output:"9"}],constraints:["0 \u2264 nums.length \u2264 10\u2075","-10\u2079 \u2264 nums[i] \u2264 10\u2079"],hint:"Put all numbers in a set for O(1) lookup. A number starts a sequence only if num-1 is not in the set. From each start, count forward while consecutive numbers exist. This ensures the inner while-loop runs O(n) total across all outer iterations.",solutions:[Ci,Ni]};var Ii=`class Solution:
    def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:
        seen = {}
        for i, num in enumerate(nums):
            if num in seen and i - seen[num] <= k:
                return True
            seen[num] = i
        return False`,qi=`class Solution:
    def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:
        # sliding window: maintain a set of all values within a window of size k
        # two pointers alone are insufficient because we need to detect any duplicate in the window, not just adjacent ones
        # a set gives O(1) membership checks and eviction as the window slides
        seen = set()
        l = r = 0

        while r < len(nums):
            while abs(l - r) > k:
                seen.remove(nums[l])
                l += 1
            if nums[r] in seen:
                return True
            seen.add(nums[r])
            r += 1

        return False`;function Ri(){let i=[1,2,1,3,2],u=2,r=[],s={};r.push({explanation:`Check if any two equal elements are within k=${u} indices of each other. HashMap approach: store the most recent index of each value. When we revisit a value, check if the gap is \u2264 k.`,highlightLine:2,state:{type:"array",cells:i.map(n=>({value:n,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"k",value:u}]});for(let n=0;n<i.length;n++){let t=i[n];if(t in s){let a=n-s[t];if(a<=u)return r.push({explanation:`i=${n}, nums[${n}]=${t}: found in seen at index ${s[t]}. Gap = ${n} \u2212 ${s[t]} = ${a} \u2264 k=${u}. Return true!`,highlightLine:4,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o===n||o===s[t]?"found":o<n?"visited":"default"})),pointers:[{index:n,label:"i"},{index:s[t],label:"prev"}],hashmap:y({},s)},variables:[{name:"num",value:t,highlight:!0},{name:"seen[num]",value:s[t]},{name:"gap",value:a,highlight:!0},{name:"return",value:"true"}]}),r;r.push({explanation:`i=${n}, nums[${n}]=${t}: found in seen at index ${s[t]}. Gap = ${a} > k=${u} \u2014 too far apart. Update seen[${t}] to ${n}.`,highlightLine:4,state:{type:"array",cells:i.map((e,o)=>({value:e,state:o===n?"active":o===s[t]?"eliminated":o<n?"visited":"default"})),pointers:[{index:n,label:"i"}],hashmap:y({},s)},variables:[{name:"num",value:t},{name:"gap",value:a},{name:"action",value:`update seen[${t}] \u2192 ${n}`}]}),s[t]=n}else s[t]=n,r.push({explanation:`i=${n}, nums[${n}]=${t}: not in seen yet. Store seen[${t}] = ${n}.`,highlightLine:6,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===n?"active":e<n?"visited":"default"})),pointers:[{index:n,label:"i"}],hashmap:y({},s)},variables:[{name:"num",value:t},{name:`seen[${t}]`,value:n,highlight:!0}]})}return r.push({explanation:`Scanned all ${i.length} elements. No duplicate pair within distance k=${u} found. Return false.`,highlightLine:7,state:{type:"array",cells:i.map(n=>({value:n,state:"visited"})),pointers:[],hashmap:y({},s)},variables:[{name:"return",value:"false",highlight:!0}]}),r}function Pi(){let i=[1,2,1,3,2],u=2,r=[],s=new Set,n=0;r.push({explanation:"Sliding window approach: maintain a set of values within a window of size k. Advance r; if r \u2212 l > k, evict nums[l] and slide l forward. Check for duplicates before adding.",highlightLine:3,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[{index:0,label:"l=r"}],hashmap:{}},variables:[{name:"k",value:u},{name:"window",value:"{}"}]});for(let t=0;t<i.length;t++){if(t-n>u&&(r.push({explanation:`r(${t}) \u2212 l(${n}) = ${t-n} > k=${u}: window too wide. Remove nums[l=${n}]=${i[n]} from window, advance l.`,highlightLine:5,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===n?"eliminated":e>=n&&e<=t?"window":e<n?"visited":"default"})),pointers:[{index:n,label:"l"},{index:t,label:"r"}],hashmap:Object.fromEntries([...s].map(a=>[a,1]))},variables:[{name:"evict",value:i[n],highlight:!0},{name:"l",value:n+1}]}),s.delete(i[n]),n++),s.has(i[t]))return r.push({explanation:`nums[r=${t}]=${i[t]} already in window [${[...s].join(",")}]. Duplicate within k=${u}! Return true.`,highlightLine:7,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===t||e>=n&&e<t&&i[e]===i[t]?"found":e>=n&&e<t?"window":e<n?"visited":"default"})),pointers:[{index:n,label:"l"},{index:t,label:"r"}],hashmap:Object.fromEntries([...s].map(a=>[a,1]))},variables:[{name:"nums[r]",value:i[t],highlight:!0},{name:"in window",value:"true"},{name:"return",value:"true"}]}),r;s.add(i[t]),r.push({explanation:`r=${t}, nums[r]=${i[t]} not in window. Add it. Window = {${[...s].join(",")}}.`,highlightLine:9,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===t?"active":e>=n&&e<t?"window":e<n?"visited":"default"})),pointers:[{index:n,label:"l"},{index:t,label:"r"}],hashmap:Object.fromEntries([...s].map(a=>[a,1]))},variables:[{name:"nums[r]",value:i[t]},{name:"window",value:`{${[...s].join(",")}}`,highlight:!0}]})}return r.push({explanation:`All elements scanned. No duplicate within distance k=${u}. Return false.`,highlightLine:10,state:{type:"array",cells:i.map(t=>({value:t,state:"visited"})),pointers:[],hashmap:Object.fromEntries([...s].map(t=>[t,1]))},variables:[{name:"return",value:"false",highlight:!0}]}),r}var Ai={label:"HashMap",pythonCode:Ii,generateSteps:Ri},ji={label:"Sliding Window Set",pythonCode:qi,generateSteps:Pi},Ke={id:"contains-duplicate-ii",lcNumber:219,title:"Contains Duplicate II",difficulty:"Easy",category:"sliding-window",tags:["Array","Hash Map","Sliding Window"],timeComplexity:"O(n)",spaceComplexity:"O(min(n,k))",description:"Given an integer array nums and an integer k, return true if there are two distinct indices i and j in the array such that nums[i] == nums[j] and |i - j| <= k.",examples:[{input:"nums = [1,2,3,1], k = 3",output:"true",explanation:"nums[0] == nums[3] and |0 - 3| = 3 \u2264 3."},{input:"nums = [1,0,1,1], k = 1",output:"true"},{input:"nums = [1,2,3,1,2,3], k = 2",output:"false"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","-10\u2079 \u2264 nums[i] \u2264 10\u2079","0 \u2264 k \u2264 10\u2075"],hint:"HashMap: store the most recent index of each number. When a repeat is found, check if the index gap \u2264 k. Sliding window: maintain a set of at most k elements; evict the leftmost before checking for a duplicate on the right.",solutions:[Ai,ji]};var Ei=`class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        # left = write cursor, right = read cursor; index 0 is always valid so both start at 1
        # write nums[right] to nums[left] only when it differs from nums[left-1] (the last confirmed unique value)
        left = right = counter = 1
        while right < len(nums):
            if nums[right] != nums[left - 1]:
                nums[left] = nums[right]
                left += 1
                counter += 1
            right += 1
        return counter`;function Fi(){let i=[1,1,2,3,3],u=[],r=(t,a)=>i.map((e,o)=>({value:e,state:o<t?"found":o===t?"active":o===a&&a!==t?"min-ptr":"default"}));u.push({explanation:"Two-pointer in-place dedup: left marks the next write slot, right scans forward. Index 0 is always valid, so both start at 1. Write nums[right] to nums[left] only when it differs from nums[left\u22121].",highlightLine:2,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[]},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});let s=1,n=1;for(;n<i.length;){let t=i[n]!==i[s-1];u.push({explanation:`right=${n}: nums[right]=${i[n]} vs nums[left\u22121]=${i[s-1]} \u2192 ${t?"different \u2014 write & advance left":"duplicate \u2014 skip"}.`,highlightLine:4,state:{type:"array",cells:r(s,n),pointers:[{index:s,label:"left"},{index:n,label:"right"}]},variables:[{name:"left",value:s},{name:"right",value:n},{name:"differs",value:String(t),highlight:!0}]}),t&&(i[s]=i[n],s++,u.push({explanation:`Wrote ${i[s-1]} at left=${s-1}. Advance left to ${s}.`,highlightLine:6,state:{type:"array",cells:r(s,n),pointers:[{index:s,label:"left"},{index:n,label:"right"}]},variables:[{name:"left",value:s,highlight:!0},{name:"right",value:n}]})),n++}return u.push({explanation:`Done. First ${s} elements are the unique sorted values. Return ${s}. O(n) time, O(1) space.`,highlightLine:9,state:{type:"array",cells:i.map((t,a)=>({value:t,state:a<s?"found":"eliminated"})),pointers:[]},variables:[{name:"return",value:s,highlight:!0}]}),u}var Di={label:"Two Pointers",pythonCode:Ei,generateSteps:Fi},Qe={id:"remove-dup-from-sorted-array",lcNumber:26,title:"Remove Duplicates from Sorted Array",difficulty:"Easy",category:"two-pointers",tags:["Array","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return k, the number of unique elements.",examples:[{input:"nums = [1,1,2]",output:"2, nums = [1,2,_]",explanation:"Two unique values; first two elements become [1,2]."},{input:"nums = [0,0,1,1,1,2,2,3,3,4]",output:"5, nums = [0,1,2,3,4,_,_,_,_,_]"}],constraints:["1 \u2264 nums.length \u2264 3 \xD7 10\u2074","-100 \u2264 nums[i] \u2264 100","nums is sorted in non-decreasing order."],hint:"left is the write cursor; right is the read cursor. Both start at 1 (index 0 is always valid). Write nums[right] to nums[left] only when it differs from nums[left\u22121], then advance left. Always advance right.",solutions:[Di]};var Bi=`class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        # same two-pointer pattern as Remove Duplicates I, but allow at most 2 copies
        # compare nums[r] against nums[l-2]: if equal, nums[r] would be a 3rd copy \u2014 skip it
        # first 2 elements are always valid, so both pointers start at index 2

        l = r = 2

        while r < len(nums):
            if nums[r] != nums[l - 2]:
                # nums[r] is not a 3rd copy \u2014 safe to keep; write it and advance the write cursor
                nums[l] = nums[r]
                l += 1
            # whether we wrote or skipped, always advance the read cursor
            r += 1
        return l`;function Hi(){let i=[1,1,1,2,2,3],u=[],r=(t,a)=>i.map((e,o)=>({value:e,state:o<t?"found":o===t?"active":o===a&&a!==t?"min-ptr":"default"}));u.push({explanation:"Same two-pointer pattern as Remove Duplicates I, but allow at most 2 copies. The first 2 elements are always valid, so l = r = 2. The invariant: nums[r] is OK to keep if it differs from nums[l\u22122] \u2014 that ensures we never write a 3rd copy of any value.",highlightLine:2,state:{type:"array",cells:i.map((t,a)=>({value:t,state:a<2?"found":"default"})),pointers:[]},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});let s=2,n=2;for(;n<i.length;){let t=i[n]!==i[s-2];u.push({explanation:`r=${n}: nums[r]=${i[n]} vs nums[l\u22122]=nums[${s-2}]=${i[s-2]} \u2192 ${t?"different \u2014 keep (\u22642 copies so far)":"3rd copy \u2014 skip"}.`,highlightLine:4,state:{type:"array",cells:r(s,n),pointers:[{index:s,label:"l"},{index:n,label:"r"}]},variables:[{name:"l",value:s},{name:"r",value:n},{name:"nums[r]",value:i[n]},{name:"nums[l\u22122]",value:i[s-2]},{name:"keep",value:String(t),highlight:!0}]}),t&&(i[s]=i[n],s++,u.push({explanation:`Wrote ${i[s-1]} at l=${s-1}. Advance l to ${s}.`,highlightLine:13,state:{type:"array",cells:r(s,n),pointers:[{index:s,label:"l"},{index:n,label:"r"}]},variables:[{name:"l",value:s,highlight:!0},{name:"r",value:n}]})),n++}return u.push({explanation:`Done. First ${s} elements allow at most 2 duplicates. Return ${s}. Same O(n)/O(1) as part I \u2014 only the comparison window shifts from [l\u22121] to [l\u22122].`,highlightLine:9,state:{type:"array",cells:i.map((t,a)=>({value:t,state:a<s?"found":"eliminated"})),pointers:[]},variables:[{name:"return",value:s,highlight:!0}]}),u}var _i={label:"Two Pointers",pythonCode:Bi,generateSteps:Hi},Je={id:"remove-dup-sorted-array-ii",lcNumber:80,title:"Remove Duplicates from Sorted Array II",difficulty:"Medium",category:"two-pointers",tags:["Array","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums sorted in non-decreasing order, remove some duplicates in-place such that each unique element appears at most twice. Return k, the number of elements in the modified prefix.",examples:[{input:"nums = [1,1,1,2,2,3]",output:"5, nums = [1,1,2,2,3,_]",explanation:"Each value appears at most twice."},{input:"nums = [0,0,1,1,1,1,2,3,3]",output:"7, nums = [0,0,1,1,2,3,3,_,_]"}],constraints:["1 \u2264 nums.length \u2264 3 \xD7 10\u2074","-10\u2074 \u2264 nums[i] \u2264 10\u2074","nums is sorted in non-decreasing order."],hint:"Generalisation of Remove Duplicates I: compare nums[r] with nums[l\u22122] instead of nums[l\u22121]. If they're equal, nums[r] would be a 3rd copy \u2014 skip it. First 2 elements are always valid so start both pointers at index 2.",solutions:[_i]};var Wi=`class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> None:
        # fill from the back so we write into the spare zeros without overwriting unprocessed values
        # leftIterator and rightIterator point to the current tail of nums1 and nums2
        # arrIterator tracks the next write position (starting at m + n - 1)
        arrIterator = m + n - 1
        leftIterator = m - 1
        rightIterator = n - 1
        # place the larger of the two current tails, then retreat that pointer
        while leftIterator >= 0 and rightIterator >= 0:
            if nums1[leftIterator] > nums2[rightIterator]:
                nums1[arrIterator] = nums1[leftIterator]
                leftIterator -= 1
            else:
                nums1[arrIterator] = nums2[rightIterator]
                rightIterator -= 1
            arrIterator -= 1
        # one array is exhausted; the remaining elements in the other are already sorted and in place
        while leftIterator >= 0:
            nums1[arrIterator] = nums1[leftIterator]
            leftIterator -= 1
            arrIterator -= 1
        while rightIterator >= 0:
            nums1[arrIterator] = nums2[rightIterator]
            rightIterator -= 1
            arrIterator -= 1`;function zi(){let i=[1,2,3,0,0,0],u=[2,5,6],r=3,s=3,n=[],t=(o,l,h)=>i.map((d,c)=>({value:d,state:c===h?"active":c<r&&c===o?"min-ptr":c>=r&&c<h||c<r&&c>o?"found":(c>=r&&d===0&&c>h,"default")}));n.push({explanation:"nums1 has m=3 real values followed by n=3 zeros (spare space). nums2 has n=3 values. Key insight: fill nums1 from the back \u2014 compare from the largest end of each array into the empty tail. This avoids overwriting unprocessed elements.",highlightLine:2,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l<r?"active":"default"})),pointers:[{index:r-1,label:"a"}],counters:[{label:"nums2",value:`[${u.join(", ")}]`},{label:"b \u2192 nums2[b]",value:`${s-1} \u2192 ${u[s-1]}`}]},variables:[{name:"m",value:r},{name:"n",value:s}]});let a=r-1,e=s-1;for(let o=r+s-1;o>=0;o--){let l,h=!1;a>=0&&e>=0?i[a]>u[e]?(l=i[a],n.push({explanation:`i=${o}: nums1[a=${a}]=${i[a]} > nums2[b=${e}]=${u[e]} \u2192 place ${i[a]} at i=${o}. Decrement a.`,highlightLine:6,state:{type:"array",cells:t(a,e,o),pointers:[{index:o,label:"i"},{index:a,label:"a"}],counters:[{label:"nums2",value:`[${u.join(", ")}]`},{label:`b=${e}`,value:`nums2[${e}]=${u[e]}`}]},variables:[{name:"place",value:i[a],highlight:!0},{name:"from",value:"nums1"}]}),i[o]=i[a],a--):(l=u[e],h=!0,n.push({explanation:`i=${o}: nums2[b=${e}]=${u[e]} \u2265 nums1[a=${a}]=${i[a]} \u2192 place ${u[e]} at i=${o}. Decrement b.`,highlightLine:9,state:{type:"array",cells:t(a,e,o),pointers:[{index:o,label:"i"},{index:a,label:"a"}],counters:[{label:"nums2",value:`[${u.join(", ")}]`},{label:`b=${e}`,value:`nums2[${e}]=${u[e]}`}]},variables:[{name:"place",value:u[e],highlight:!0},{name:"from",value:"nums2"}]}),i[o]=u[e],e--):a>=0?(n.push({explanation:`i=${o}: nums2 exhausted (b<0). Copy nums1[a=${a}]=${i[a]} to i=${o}.`,highlightLine:11,state:{type:"array",cells:t(a,e,o),pointers:[{index:o,label:"i"},{index:a,label:"a"}],counters:[{label:"nums2",value:"exhausted"}]},variables:[{name:"place",value:i[a],highlight:!0}]}),i[o]=i[a],a--):e>=0&&(n.push({explanation:`i=${o}: nums1 exhausted (a<0). Copy nums2[b=${e}]=${u[e]} to i=${o}.`,highlightLine:13,state:{type:"array",cells:t(a,e,o),pointers:[{index:o,label:"i"}],counters:[{label:"nums2",value:`[${u.join(", ")}]`},{label:`b=${e}`,value:`nums2[${e}]=${u[e]}`}]},variables:[{name:"place",value:u[e],highlight:!0}]}),i[o]=u[e],e--)}return n.push({explanation:`Merged in-place: [${i.join(", ")}]. O(m+n) time, O(1) space \u2014 filling backwards avoids any element being overwritten before it's read.`,highlightLine:15,state:{type:"array",cells:i.map(o=>({value:o,state:"found"})),pointers:[],counters:[{label:"nums2",value:"exhausted"}]},variables:[{name:"result",value:`[${i.join(", ")}]`,highlight:!0}]}),n}var Yi={label:"Merge from Back",pythonCode:Wi,generateSteps:zi},Ze={id:"merge-sorted-array",lcNumber:88,title:"Merge Sorted Array",difficulty:"Easy",category:"two-pointers",tags:["Array","Two Pointers","Sorting"],timeComplexity:"O(m+n)",spaceComplexity:"O(1)",description:"You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n. Merge nums2 into nums1 as one sorted array in-place. nums1 has length m+n with the last n elements set to 0.",examples:[{input:"nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",output:"[1,2,2,3,5,6]",explanation:"Arrays [1,2,3] and [2,5,6] merge to [1,2,2,3,5,6]."},{input:"nums1 = [1], m = 1, nums2 = [], n = 0",output:"[1]"}],constraints:["nums1.length == m + n","nums2.length == n","0 \u2264 m, n \u2264 200","-10\u2079 \u2264 nums1[i], nums2[j] \u2264 10\u2079"],hint:"Fill nums1 from the back (index m+n\u22121 down to 0). Keep pointer a at the end of nums1's real values and b at the end of nums2. Place the larger of the two and decrement the corresponding pointer. When one array is exhausted, copy the rest of the other.",solutions:[Yi]};var Gi=`class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        # the prefix can never be longer than the shortest string, so scan that as our limit
        # at each position, if any string diverges from the shortest, we have our answer

        shortestString = min(strs, key=len)

        lcp = ""

        for i in range(len(shortestString)):
            for str in strs:
                if str[i] != shortestString[i]:
                    return lcp
            lcp += shortestString[i]

        return lcp`;function Vi(){let i=["flower","flow","flight"],u=[],r=i.reduce((t,a)=>t.length<=a.length?t:a),s="";u.push({explanation:`Find the longest prefix shared by all ${i.length} strings. Strategy: the prefix can never be longer than the shortest string \u2014 "${r}". Scan it character by character; stop the moment any string diverges.`,highlightLine:2,state:{type:"array",cells:r.split("").map(t=>({value:t,state:"default"})),pointers:[],hashmap:Object.fromEntries(i.map((t,a)=>[`str${a+1}`,t]))},variables:[{name:"shortest",value:r},{name:"lcp",value:'""'}]});let n=(t,a)=>{let e={};return i.forEach((o,l)=>{let h=t===l?a==="bad"?" \u2717":a==="ok"?" \u2713":" \u25C0":"";e[`str${l+1}`]=`"${o}"${h}`}),e};e:for(let t=0;t<r.length;t++){let a=r[t];for(let e=0;e<i.length;e++){let o=i[e],l=o[t]===a;if(u.push({explanation:l?`i=${t}: check string "${o}". Is "${o}"[${t}] = "${o[t]}" equal to the shortest's "${a}"? Yes \u2713 \u2014 keep going to the next string.`:`i=${t}: check string "${o}". Is "${o}"[${t}] = "${o[t]}" equal to "${a}"? NO \u2717 \u2014 a string diverged here, so the common prefix ends. Return lcp="${s}".`,highlightLine:l?5:6,state:{type:"array",cells:r.split("").map((h,d)=>({value:h,state:d<t?"found":d===t?l?"active":"eliminated":"default"})),pointers:[{index:t,label:"i"}],hashmap:n(e,l?"ok":"bad")},variables:[{name:"i",value:t},{name:"checking",value:`"${o}"`,highlight:!0},{name:`"${o}"[${t}]`,value:`"${o[t]}"`},{name:"shortest char",value:`"${a}"`},{name:"equal?",value:l?"yes":"NO \u2192 return",highlight:!l}]}),!l)break e}s+=a,u.push({explanation:`i=${t}: every string had "${a}" at position ${t} \u2713. Commit it \u2014 lcp grows to "${s}". Move to the next position.`,highlightLine:8,state:{type:"array",cells:r.split("").map((e,o)=>({value:e,state:o<s.length?"found":o===s.length?"active":"default"})),pointers:[{index:t,label:"i"}],hashmap:n(null)},variables:[{name:"i",value:t},{name:"char",value:a},{name:"lcp",value:`"${s}"`,highlight:!0}]})}return s===r&&u.push({explanation:`Reached end of shortest string "${r}" with no mismatch. Return lcp="${s}".`,highlightLine:16,state:{type:"array",cells:r.split("").map(t=>({value:t,state:"found"})),pointers:[],hashmap:Object.fromEntries(i.map((t,a)=>[`str${a+1}`,t]))},variables:[{name:"return",value:`"${s}"`,highlight:!0}]}),u}var Ui={label:"Vertical Scan",pythonCode:Gi,generateSteps:Vi},et={id:"longest-common-prefix",lcNumber:14,title:"Longest Common Prefix",difficulty:"Easy",category:"arrays-hash",tags:["String","Trie"],timeComplexity:"O(m\xB7n)",spaceComplexity:"O(1)",description:'Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string "".',examples:[{input:'strs = ["flower","flow","flight"]',output:'"fl"',explanation:'"fl" is the longest prefix common to all three strings.'},{input:'strs = ["dog","racecar","car"]',output:'""',explanation:"No common prefix."}],constraints:["1 \u2264 strs.length \u2264 200","0 \u2264 strs[i].length \u2264 200","strs[i] consists of only lowercase English letters."],hint:"Find the shortest string first \u2014 the LCP can never be longer. Then scan column by column (same index across all strings). The moment any string differs, return what you have.",solutions:[Ui]};var Xi=`class Solution:
    def removeNthFromEnd(self, head, n):
        # nth node from the end is length - n node from the front
        # so we want to point node at length - n - 1 to node at length - n + 1
        # since we are removing, we might be removing head, so let's create a dummy node to keep track

        length = 0
        dummy = ListNode(0)
        dummy.next = head
        ptr = dummy

        # [1,2,3,4,5]; n = 2; index = 3 -> length - n to be removed
        # [0,1,2,3,4,5]; n = 2; index = 4 -> length - n to be removed

        while ptr:
            length += 1
            ptr = ptr.next

        indexToRepoint = length - n - 1

        # now we traverse again until we get to indexToRepoint

        ptr = dummy

        for i in range(indexToRepoint + 1):
            if i == indexToRepoint:
                ptr.next = ptr.next.next
            ptr = ptr.next

        return dummy.next`;function he(i,u,r){return i.map((s,n)=>({id:`n${n}`,value:s,nextId:n<i.length-1?`n${n+1}`:null,state:n===r?"active":n===u?"curr":"default"}))}function Ki(){let i=[1,2,3,4,5],u=2,r=[0,...i],s=[];s.push({explanation:`Remove the ${u}nd node from the end of [${i.join("\u2192")}]. Prepend a dummy node (0) so removing the head is handled the same as any other removal.`,highlightLine:2,state:{type:"linked-list",nodes:he(r,0,null),pointers:[]},variables:[{name:"n",value:u},{name:"dummy",value:"0 \u2192 head"}]});let n=0;for(let e=0;e<r.length;e++)n++,s.push({explanation:`Pass 1 \u2014 ptr at index ${e} (val=${r[e]}). length = ${n}.`,highlightLine:5,state:{type:"linked-list",nodes:he(r,e,null),pointers:[{nodeId:`n${e}`,label:"ptr"}]},variables:[{name:"ptr",value:`index ${e}`},{name:"length",value:n}]});let t=n-u-1;s.push({explanation:`Pass 1 done. length=${n} (includes dummy). Repoint index = ${n} \u2212 ${u} \u2212 1 = ${t}. Node to remove is at index ${t+1} (val=${r[t+1]}).`,highlightLine:9,state:{type:"linked-list",nodes:he(r,null,null),pointers:[]},variables:[{name:"length",value:n},{name:"repoint idx",value:t,highlight:!0},{name:"remove val",value:r[t+1]}]});for(let e=0;e<=t;e++){let o=e===t;s.push({explanation:o?`i=${e}: at repoint node (val=${r[e]}). Set ptr.next = ptr.next.next \u2192 skips val=${r[e+1]}.`:`Pass 2 \u2014 i=${e}: advancing ptr to index ${e} (val=${r[e]}).`,highlightLine:o?12:11,state:{type:"linked-list",nodes:he(r,e,o?e+1:null),pointers:[{nodeId:`n${e}`,label:"ptr"}]},variables:[{name:"i",value:e},{name:"ptr val",value:r[e],highlight:o}]})}let a=r.filter((e,o)=>o!==t+1).slice(1);return s.push({explanation:`val=${r[t+1]} removed. Return dummy.next \u2192 [${a.join("\u2192")}]. O(n) time, O(1) space \u2014 two passes.`,highlightLine:30,state:{type:"linked-list",nodes:a.map((e,o)=>({id:`r${o}`,value:e,nextId:o<a.length-1?`r${o+1}`:null,state:"done"})),pointers:[]},variables:[{name:"return",value:`[${a.join("\u2192")}]`,highlight:!0}]}),s}var Qi=`class Solution:
    def removeNthFromEnd(self, head, n):
        # so we know from our previous implementation that we want to remove len - n node from the start
        # we can use a two pointer approach where l and r are n apart
        # l will be the element to remove when r becomes None
        # so we want to re-link when r.next is None since we are removing l
        # since we are removing a node, we should use a dummy node

        dummy = ListNode(0)
        dummy.next = head

        l = dummy
        r = head

        # move r to l + n
        while n > 0 and r:
            r = r.next
            n-=1

        # now we just move l and r together
        while r:
            l = l.next
            r = r.next

        l.next = l.next.next

        return dummy.next`;function Ji(){let i=[1,2,3,4,5],u=2,r=[0,...i],s=[],n=(l,h,d=null)=>({type:"linked-list",nodes:r.map((c,p)=>({id:`n${p}`,value:c,nextId:p<r.length-1?`n${p+1}`:null,state:p===d?"active":p===l?"curr":p===h?"next-node":"default"})),pointers:[...l!==null?[{nodeId:`n${l}`,label:"l"}]:[],...h!==null?[{nodeId:`n${h}`,label:"r"}]:[{nodeId:null,label:"r=None"}]]});s.push({explanation:`One pass: hold two pointers l and r exactly n=${u} apart. When r runs off the end, l will be sitting just before the node to remove. The dummy(0) makes head-removal uniform.`,highlightLine:9,state:n(0,1),variables:[{name:"l",value:"dummy(0)"},{name:"r",value:"head(1)"},{name:"n",value:u}]});let t=1;for(let l=0;l<u;l++)t++,s.push({explanation:`Open the gap: advance r by 1 \u2192 val=${r[t]}. ${u-1-l} more step(s) so r is n=${u} ahead of l.`,highlightLine:16,state:n(0,t),variables:[{name:"r",value:`val ${r[t]}`,highlight:!0},{name:"gap",value:l+1}]});let a=0;for(;t<r.length;){a++,t++;let l=t>=r.length;s.push({explanation:l?`Move both: l\u2192val=${r[a]}, r\u2192None. r reached the end, so l is exactly one node before the target.`:`Move both forward together (gap stays ${u}): l\u2192val=${r[a]}, r\u2192val=${r[t]}.`,highlightLine:21,state:n(a,l?null:t),variables:[{name:"l",value:`val ${r[a]}`,highlight:l},{name:"r",value:l?"None":`val ${r[t]}`}]})}let e=a+1;s.push({explanation:`l is at val=${r[a]} (just before the target). Set l.next = l.next.next \u2192 drop val=${r[e]} (the ${u}nd from the end).`,highlightLine:24,state:n(a,null,e),variables:[{name:"remove",value:r[e],highlight:!0}]});let o=r.filter((l,h)=>h!==e).slice(1);return s.push({explanation:`Removed val=${r[e]} in a single pass. Return dummy.next \u2192 [${o.join("\u2192")}]. O(n) time, O(1) space \u2014 and only one traversal.`,highlightLine:26,state:{type:"linked-list",nodes:o.map((l,h)=>({id:`r${h}`,value:l,nextId:h<o.length-1?`r${h+1}`:null,state:"done"})),pointers:[]},variables:[{name:"return",value:`[${o.join("\u2192")}]`,highlight:!0}]}),s}var Zi=`class Solution:
    def removeNthFromEnd(self, head, n):
        # we still need a dummy node in case of head removal
        dummy = ListNode(0)
        dummy.next = head

        # since it is recursion, we start at end of the list
        # when we are at nth node from the end
        # we want the return to be current.next so we remove reference
        # keep track of current node # from the end
        counter = 0
        def removeNthNode(head):
            nonlocal counter
            if not head:
                return None

            # set caller's next to return
            head.next = removeNthNode(head.next)
            counter+=1

            # if counter is at n, return next instead of current
            if counter == n:
                return head.next

            return head

        removeNthNode(dummy)
        return dummy.next`;function es(){let i=[1,2,3,4,5],u=2,r=[0,...i],s=[],n=(h,d,c)=>({type:"linked-list",nodes:r.map((p,m)=>({id:`n${m}`,value:p,nextId:m<r.length-1?`n${m+1}`:null,state:m===d?"active":m===h?"curr":c.has(m)?"done":"default"})),pointers:h!==null?[{nodeId:`n${h}`,label:"head"}]:[]});s.push({explanation:"Recursion: dive all the way to the end first, then count nodes as the calls unwind. The moment counter == n, return head.next so that node is dropped. Dummy(0) guards against removing the real head.",highlightLine:11,state:n(0,null,new Set),variables:[{name:"counter",value:0},{name:"n",value:u}]});let t=0;for(let h=0;h<r.length;h++)t++,s.push({explanation:`Descend: removeNthNode(val=${r[h]}) recurses into .next BEFORE doing anything (call-stack depth ${t}).`,highlightLine:18,state:n(h,null,new Set),variables:[{name:"head",value:r[h]},{name:"call depth",value:t}]});t++,s.push({explanation:"removeNthNode(None): base case, return None. Now the stack unwinds, counting from the end.",highlightLine:14,state:n(null,null,new Set),variables:[{name:"head",value:"None"},{name:"return",value:"None"}]});let a=0,e=null,o=new Set;for(let h=r.length-1;h>=0;h--)t--,a++,a===u?(e=h,s.push({explanation:`Unwind to val=${r[h]}: counter \u2192 ${a} == n=${u}! Return head.next instead of head \u2014 this node (val=${r[h]}) is dropped, so its caller links past it.`,highlightLine:22,state:n(h,h,o),variables:[{name:"counter",value:a,highlight:!0},{name:"drop",value:r[h],highlight:!0}]})):s.push({explanation:`Unwind to val=${r[h]}: counter \u2192 ${a} (\u2260 ${u}). Return this node unchanged.`,highlightLine:24,state:n(h,null,o),variables:[{name:"counter",value:a},{name:"return",value:`val ${r[h]}`}]}),o.add(h);let l=r.filter((h,d)=>d!==e).slice(1);return s.push({explanation:`Recursion complete \u2014 the counter==n node was dropped on the way up. Return dummy.next \u2192 [${l.join("\u2192")}]. O(n) time, O(n) call-stack space.`,highlightLine:27,state:{type:"linked-list",nodes:l.map((h,d)=>({id:`r${d}`,value:h,nextId:d<l.length-1?`r${d+1}`:null,state:"done"})),pointers:[]},variables:[{name:"return",value:`[${l.join("\u2192")}]`,highlight:!0}]}),s}var ts={label:"Two-Pass",pythonCode:Xi,generateSteps:Ki},as={label:"One-Pass Two-Pointer",pythonCode:Qi,generateSteps:Ji},ns={label:"Recursion",pythonCode:Zi,generateSteps:es},tt={id:"remove-nth-node-from-end",lcNumber:19,title:"Remove Nth Node From End of List",difficulty:"Medium",category:"linked-list",tags:["Linked List","Two Pointers","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given the head of a linked list, remove the nth node from the end of the list and return its head.",examples:[{input:"head = [1,2,3,4,5], n = 2",output:"[1,2,3,5]",explanation:"The 2nd node from the end (val=4) is removed."},{input:"head = [1], n = 1",output:"[]"},{input:"head = [1,2], n = 1",output:"[1]"}],constraints:["The number of nodes in the list is sz.","1 \u2264 sz \u2264 30","0 \u2264 Node.val \u2264 100","1 \u2264 n \u2264 sz"],hint:"Prepend a dummy node so removing the real head is no different from removing any other node. Two-pass: count length, then walk to (length \u2212 n \u2212 1). One pass: keep two pointers n apart so the lead hits the end exactly when the trailing one is before the target. Recursion: count from the end as the stack unwinds.",solutions:[ts,as,ns]};var is=`class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        # Since we know it's sorted
        # we can just use two pointers, one starting from left
        # one starting from right
        # if l + r > target, move r left
        # if l + r < target, move l right
        # if equal return l and r

        l, r = 0, len(numbers) - 1

        while l < r:
            if numbers[l] + numbers[r] == target:
                return [l+1,r+1]
            if numbers[l] + numbers[r] > target:
                r-=1
            else:
                l+=1`;function ss(){let i=[2,7,11,15],u=9,r=[],s=(a,e,o=!1)=>i.map((l,h)=>({value:l,state:o&&(h===a||h===e)?"found":h===a?"active":h===e?"min-ptr":h>a&&h<e?"window":"eliminated"}));r.push({explanation:"Two Sum II uses the sorted property. Start with l=0 (smallest) and r=n\u22121 (largest). Their sum tells us exactly which direction to move: too small \u2192 advance l; too large \u2192 retreat r. No hash map needed \u2014 O(1) space.",highlightLine:2,state:{type:"array",cells:i.map(a=>({value:a,state:"default"})),pointers:[]},variables:[{name:"target",value:u}]});let n=0,t=i.length-1;for(;n<t;){let a=i[n]+i[t];if(r.push({explanation:`l=${n}, r=${t}: nums[l]+nums[r] = ${i[n]}+${i[t]} = ${a}. ${a===u?`Equals target ${u}!`:a<u?`${a} < ${u} \u2192 sum too small, advance l.`:`${a} > ${u} \u2192 sum too large, retreat r.`}`,highlightLine:a===u?6:a<u?8:10,state:{type:"array",cells:s(n,t,a===u),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n},{name:"r",value:t},{name:"sum",value:a,highlight:!0},{name:"target",value:u}]}),a===u){r.push({explanation:`Found: indices [${n+1}, ${t+1}] (1-indexed). O(n) time, O(1) space.`,highlightLine:7,state:{type:"array",cells:s(n,t,!0),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"return",value:`[${n+1}, ${t+1}]`,highlight:!0}]});break}else a<u?n++:t--}return r}var rs={label:"Two Pointers",pythonCode:is,generateSteps:ss},at={id:"two-sum-ii",lcNumber:167,title:"Two Sum II",difficulty:"Medium",category:"two-pointers",tags:["Array","Two Pointers","Binary Search"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return their indices as a 1-indexed array [index1, index2].",examples:[{input:"numbers = [2,7,11,15], target = 9",output:"[1,2]",explanation:"numbers[1] + numbers[2] = 2 + 7 = 9."},{input:"numbers = [2,3,4], target = 6",output:"[1,3]"}],constraints:["2 \u2264 numbers.length \u2264 3 \xD7 10\u2074","-1000 \u2264 numbers[i] \u2264 1000","numbers is sorted in non-decreasing order.","Exactly one solution exists.","You may not use the same element twice.","O(1) extra space required."],hint:"Use two pointers at opposite ends. The sorted order guarantees: if the sum is too small, moving l right increases it; if too large, moving r left decreases it. Exactly one valid pair exists so the loop always terminates with a result.",solutions:[rs]};var ls=`class Solution:
    def maxArea(self, height: List[int]) -> int:
        # height = min(height[l], height[r])
        # width = r - l
        # currentMaxArea = (r - l) * min(height[l], height[r])
        # start l = 0, r = len(height) - 1
        # increment min(height[l], height[r])
        # update maxArea = max(maxArea, currentMaxArea) each iteration
        # return maxArea
        maxArea = 0
        l = 0
        r = len(height) - 1
        while l < r:
            areaHeight = min(height[l], height[r])
            areaWidth = r - l
            currentMaxArea = areaHeight * areaWidth
            maxArea = max(maxArea, currentMaxArea)
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        return maxArea`;function os(){let i=[1,8,6,2,5,4,8,3,7],u=[],r=(o,l,h,d)=>i.map((c,p)=>({value:c,state:(p===h||p===d)&&h!==o?"found":p===o?"active":p===l?"min-ptr":p>o&&p<l?"window":"eliminated"}));u.push({explanation:"Container width = r \u2212 l. Height is capped by the shorter wall: min(h[l], h[r]). Always move the shorter wall inward \u2014 moving the taller one can only shrink width while keeping the height cap the same or lower, so it can never help.",highlightLine:2,state:{type:"array",cells:i.map(o=>({value:o,state:"default"})),pointers:[],counters:[{label:"maxWater",value:0}]},variables:[{name:"height",value:`[${i.join(",")}]`}]});let s=0,n=i.length-1,t=0,a=0,e=i.length-1;for(;s<n;){let o=Math.min(i[s],i[n])*(n-s),l=o>t;l&&(t=o,a=s,e=n),u.push({explanation:`l=${s}(h=${i[s]}), r=${n}(h=${i[n]}): water = min(${i[s]},${i[n]}) \xD7 ${n-s} = ${o}. maxWater = ${t}${l?" \u2190 new best!":""}. Move ${i[s]<i[n]?"l (shorter wall)":"r (shorter or equal wall)"} inward.`,highlightLine:i[s]<i[n]?8:10,state:{type:"array",cells:r(s,n,a,e),pointers:[{index:s,label:"l"},{index:n,label:"r"}],counters:[{label:"maxWater",value:t}]},variables:[{name:"water",value:o,highlight:l},{name:"maxWater",value:t}]}),i[s]<i[n]?s++:n--}return u.push({explanation:`l(${s}) met r(${n}). Best container: walls at indices ${a} and ${e} (heights ${i[a]}, ${i[e]}), water = ${t}. O(n) time, O(1) space.`,highlightLine:11,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===a||l===e?"found":"eliminated"})),pointers:[],counters:[{label:"maxWater",value:t}]},variables:[{name:"return",value:t,highlight:!0}]}),u}var us={label:"Two Pointers",pythonCode:ls,generateSteps:os},nt={id:"container-with-most-water",lcNumber:11,title:"Container With Most Water",difficulty:"Medium",category:"arrays-hash",tags:["Array","Two Pointers","Greedy"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water a container can store.",examples:[{input:"height = [1,8,6,2,5,4,8,3,7]",output:"49",explanation:"Lines at index 1 (h=8) and index 8 (h=7): min(8,7)\xD77 = 49."},{input:"height = [1,1]",output:"1"}],constraints:["n == height.length","2 \u2264 n \u2264 10\u2075","0 \u2264 height[i] \u2264 10\u2074"],hint:"Start with the widest container (l=0, r=n\u22121). Moving the taller wall inward can only decrease or maintain width while the height cap stays the same \u2014 it can never improve the area. So always move the shorter wall. This guarantees you never miss the optimal pair.",solutions:[us]};var hs=`class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        anagramMap = {}
        for str in strs:
            sortedStr = ''.join(sorted(str))
            # a plain dict raises KeyError on missing keys, so initialize the list explicitly
            if sortedStr not in anagramMap:
                anagramMap[sortedStr] = []
            anagramMap[sortedStr].append(str)
        return list(anagramMap.values())`,ds=`class Solution:
    def groupAnagramsAlternative(self, strs: List[str]) -> List[List[str]]:
        # defaultdict(list) automatically initializes missing keys to [], removing the need for an explicit check
        anagramMap = defaultdict(list)
        for str in strs:
            sortedStr = ''.join(sorted(str))
            anagramMap[sortedStr].append(str)
        return list(anagramMap.values())`;function cs(){let i=["eat","tea","tan","ate","nat","bat"],u=[],r={};u.push({explanation:"Anagrams share the same characters. Sort each string to get a canonical key \u2014 all anagrams produce the same key. Group by that key in a hash map.",highlightLine:2,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"strs",value:`[${i.map(t=>`"${t}"`).join(", ")}]`}]});for(let t=0;t<i.length;t++){let a=i[t],e=a.split("").sort().join("");r[e]||(r[e]=[]),r[e].push(a);let o={};for(let[l,h]of Object.entries(r))o[l]=`[${h.map(d=>`"${d}"`).join(", ")}]`;u.push({explanation:`"${a}" \u2192 sorted key = "${e}". Append to groups["${e}"]. Group is now ${o[e]}.`,highlightLine:4,state:{type:"array",cells:i.map((l,h)=>({value:l,state:h===t?"active":h<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:o},variables:[{name:"s",value:`"${a}"`},{name:"key",value:`"${e}"`,highlight:!0},{name:`groups["${e}"]`,value:o[e]}]})}let s=Object.values(r),n={};for(let[t,a]of Object.entries(r))n[t]=`[${a.map(e=>`"${e}"`).join(", ")}]`;return u.push({explanation:`All strings grouped. ${s.length} groups: ${s.map(t=>"["+t.map(a=>`"${a}"`).join(", ")+"]").join(", ")}. O(n\xB7k log k) time where k is max string length.`,highlightLine:6,state:{type:"array",cells:i.map(t=>({value:t,state:"found"})),pointers:[],hashmap:n},variables:[{name:"groups",value:s.length,highlight:!0}]}),u}function ps(){let i=["eat","tea","tan","ate","nat","bat"],u=[],r={};u.push({explanation:'Same sort-the-key idea, but using defaultdict(list). The difference: with a plain dict you must write "if key not in map: map[key] = []" before appending. defaultdict creates that empty list automatically the first time a key is touched, so we can append directly \u2014 one fewer line and no missing-key check.',highlightLine:4,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"anagramMap",value:"defaultdict(list)"}]});for(let t=0;t<i.length;t++){let a=i[t],e=a.split("").sort().join(""),o=!r[e];o&&(r[e]=[]),r[e].push(a);let l={};for(let[h,d]of Object.entries(r))l[h]=`[${d.map(c=>`"${c}"`).join(", ")}]`;u.push({explanation:`"${a}" \u2192 sorted key = "${e}". ${o?`Key "${e}" is new \u2014 defaultdict auto-creates an empty list, then we append.`:`Key "${e}" already exists \u2014 append directly.`} Group is now ${l[e]}.`,highlightLine:7,state:{type:"array",cells:i.map((h,d)=>({value:h,state:d===t?"active":d<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:l},variables:[{name:"s",value:`"${a}"`},{name:"key",value:`"${e}"`,highlight:!0},{name:"auto-created?",value:o?"yes":"no",highlight:o},{name:`groups["${e}"]`,value:l[e]}]})}let s=Object.values(r),n={};for(let[t,a]of Object.entries(r))n[t]=`[${a.map(e=>`"${e}"`).join(", ")}]`;return u.push({explanation:`All strings grouped into ${s.length} buckets: ${s.map(t=>"["+t.map(a=>`"${a}"`).join(", ")+"]").join(", ")}. Return the map's values.`,highlightLine:8,state:{type:"array",cells:i.map(t=>({value:t,state:"found"})),pointers:[],hashmap:n},variables:[{name:"groups",value:s.length,highlight:!0}]}),u}var ms={label:"Sort Key HashMap",pythonCode:hs,generateSteps:cs},gs={label:"defaultdict",pythonCode:ds,generateSteps:ps},it={id:"group-anagrams",lcNumber:49,title:"Group Anagrams",difficulty:"Medium",category:"arrays-hash",tags:["Hash Map","String","Sorting"],timeComplexity:"O(n\xB7k log k)",spaceComplexity:"O(n\xB7k)",description:"Given an array of strings strs, group the anagrams together. You can return the answer in any order. An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.",examples:[{input:'strs = ["eat","tea","tan","ate","nat","bat"]',output:'[["bat"],["nat","tan"],["ate","eat","tea"]]'},{input:'strs = [""]',output:'[[""]]'}],constraints:["1 \u2264 strs.length \u2264 10\u2074","0 \u2264 strs[i].length \u2264 100","strs[i] consists of lowercase English letters."],hint:"Anagrams sort to the same string. Use sorted(s) as the hash map key. An alternative O(n\xB7k) approach uses a 26-character frequency count as the key instead of sorting.",solutions:[ms,gs]};var fs=`class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # if we are looking for logn time, we can't go through the array to find k
        # we should binary search to find k
        # then binary search on the 2 halves
        # k is smallest value, thus we do binary search on smallest value
        # since we are not looking for an exact value, we should do while l < r instead of while l <= r
        # Want exact target index? l <= r
        # Want first/last occurrence or smallest pivot? l < r
        # If one branch keeps mid as possible answer, prefer l < r
        # If both branches exclude mid, use l <= r

        l, r = 0, len(nums) - 1

        while l < r:
            mid = (l + r) // 2
            if nums[mid] > nums[r]:
                l = mid + 1
            else:
                r = mid

        k = l

        # binary search on both halves

        def binarySearch(l, r) -> int:
            while l <= r:
                mid = (l + r) // 2
                if nums[mid] == target:
                    return mid
                elif nums[mid] > target:
                    r = mid - 1
                else:
                    l = mid + 1
            return -1

        result = binarySearch(0, k - 1)
        if result == -1:
            result = binarySearch(k, len(nums) - 1)

        return result`;function vs(){let i=[4,5,6,7,0,1,2],u=0,r=[],s=(d,c,p)=>i.map((m,f)=>({value:m,state:f===p?"active":f>=d&&f<=c?"window":"eliminated"})),n=(d,c,p,m)=>i.map((f,g)=>({value:f,state:g===p?"active":g>=d&&g<=c?"window":g===m?"min-ptr":"eliminated"}));r.push({explanation:`[${i.join(",")}] is a sorted array rotated at some pivot. Find target=${u}. Strategy: (1) binary search to find the pivot (index of minimum); (2) binary search the correct half.`,highlightLine:2,state:{type:"array",cells:i.map(d=>({value:d,state:"default"})),pointers:[]},variables:[{name:"target",value:u}]});let t=0,a=i.length-1;for(r.push({explanation:"Phase 1 \u2014 find pivot. Rule: if nums[mid] > nums[r], the min is in the right half (l = mid+1). Otherwise min is at mid or left (r = mid). We use l < r so mid is never r, preventing infinite loops.",highlightLine:4,state:{type:"array",cells:s(t,a,null),pointers:[{index:t,label:"l"},{index:a,label:"r"}]},variables:[{name:"phase",value:"1 \u2014 find pivot"}]});t<a;){let d=Math.floor((t+a)/2),c=i[d]>i[a];r.push({explanation:`l=${t}, r=${a}, mid=${d}: nums[mid]=${i[d]} ${c?">":"\u2264"} nums[r]=${i[a]} \u2192 ${c?"min is right of mid, l = mid+1":"min is at mid or left, r = mid"}.`,highlightLine:c?7:9,state:{type:"array",cells:s(t,a,d),pointers:[{index:t,label:"l"},{index:d,label:"mid"},{index:a,label:"r"}]},variables:[{name:"mid",value:d},{name:"nums[mid]",value:i[d]},{name:"nums[r]",value:i[a]},{name:c?"l \u2192":"r \u2192",value:c?d+1:d,highlight:!0}]}),c?t=d+1:a=d}let e=t;r.push({explanation:`Pivot found at k=${e} (nums[k]=${i[e]}, the minimum). Array has two sorted halves: [0..${e-1}] = [${i.slice(0,e).join(",")}] and [${e}..${i.length-1}] = [${i.slice(e).join(",")}].`,highlightLine:10,state:{type:"array",cells:i.map((d,c)=>({value:d,state:c===e?"min-ptr":c<e?"visited":"window"})),pointers:[{index:e,label:"k (pivot)"}]},variables:[{name:"k",value:e,highlight:!0},{name:"nums[k]",value:i[e]}]});let o=(d,c,p)=>{for(r.push({explanation:`Phase 2 \u2014 binary search ${p} [${d}..${c}] = [${i.slice(d,c+1).join(",")}] for target=${u}.`,highlightLine:13,state:{type:"array",cells:n(d,c,null,e),pointers:[{index:d,label:"lo"},{index:c,label:"hi"}]},variables:[{name:"searching",value:p}]});d<=c;){let m=Math.floor((d+c)/2);if(r.push({explanation:`lo=${d}, hi=${c}, mid=${m}: nums[mid]=${i[m]} ${i[m]===u?"= target \u2713":i[m]>u?"> target \u2192 hi = mid\u22121":"< target \u2192 lo = mid+1"}.`,highlightLine:i[m]===u?14:i[m]>u?15:16,state:{type:"array",cells:n(d,c,m,e),pointers:[{index:d,label:"lo"},{index:m,label:"mid"},{index:c,label:"hi"}]},variables:[{name:"mid",value:m},{name:"nums[mid]",value:i[m],highlight:i[m]===u}]}),i[m]===u)return m;i[m]>u?c=m-1:d=m+1}return-1},l=e>0?o(0,e-1,"left half"):-1;if(l!==-1)return r.push({explanation:`Found target=${u} at index ${l}. O(log n) time.`,highlightLine:18,state:{type:"array",cells:i.map((d,c)=>({value:d,state:c===l?"found":"eliminated"})),pointers:[{index:l,label:"result"}]},variables:[{name:"return",value:l,highlight:!0}]}),r;r.push({explanation:`target=${u} not in left half. Try right half [${e}..${i.length-1}].`,highlightLine:18,state:{type:"array",cells:i.map((d,c)=>({value:d,state:c<e?"eliminated":"window"})),pointers:[]},variables:[{name:"left result",value:-1}]});let h=o(e,i.length-1,"right half");return r.push({explanation:h!==-1?`Found target=${u} at index ${h}. O(log n) time.`:`target=${u} not found. Return \u22121.`,highlightLine:18,state:{type:"array",cells:i.map((d,c)=>({value:d,state:c===h?"found":"eliminated"})),pointers:h!==-1?[{index:h,label:"result"}]:[]},variables:[{name:"return",value:h,highlight:!0}]}),r}var ys={label:"Find Pivot + Binary Search",pythonCode:fs,generateSteps:vs},st={id:"search-in-rotated-sorted-array",lcNumber:33,title:"Search in Rotated Sorted Array",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(log n)",spaceComplexity:"O(1)",description:"Given the integer array nums sorted in ascending order and then possibly rotated at an unknown pivot, and an integer target, return the index of target if it is in nums, or -1 if it is not.",examples:[{input:"nums = [4,5,6,7,0,1,2], target = 0",output:"4"},{input:"nums = [4,5,6,7,0,1,2], target = 3",output:"-1"}],constraints:["1 \u2264 nums.length \u2264 5000","-10\u2074 \u2264 nums[i] \u2264 10\u2074","All values of nums are unique.","nums is an ascending array that is possibly rotated.","-10\u2074 \u2264 target \u2264 10\u2074"],hint:"Two-pass O(log n): (1) find the rotation pivot k by binary searching for the minimum \u2014 if nums[mid] > nums[r] the min is to the right, otherwise it's at mid or left; (2) binary search each sorted half [0..k\u22121] and [k..n\u22121] independently.",solutions:[ys]};var bs=`from collections import defaultdict

class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        # at most 2 elements can appear more than n/3 times, so we only need to track 2 candidates
        # whenever a 3rd distinct value appears, decrement every candidate's count \u2014 this cancels
        # one occurrence of each against the new value (extended Boyer-Moore)
        # after the scan, do a verification pass since counts were decremented and may not reflect true frequency

        freqCount = defaultdict(int)

        for n in nums:
            freqCount[n] += 1
            # if we still have at most 2 candidates, no cancellation needed
            if len(freqCount) <= 2:
                continue
            else:
                # if we have more than 2, decrement all
                for key, value in freqCount.items():
                    freqCount[key] -= 1
                    # can't delete while iterating \u2014 collect keys to delete in a separate pass
                for n in list(freqCount):
                    if freqCount[n] == 0:
                        freqCount.pop(n)

        result = []

        # decrementing may have reduced stored counts below their true frequency,
        # so we must re-count from the original array to confirm each candidate is genuine
        for n in freqCount:
            # nums.count(n) is O(n), but freqCount has at most 2 candidates, so total is O(2n) = O(n)
            if nums.count(n) > len(nums) // 3:
                result.append(n)

        return result`;function ws(){let i=[1,1,1,3,3,2,2,2],u=[],r={};u.push({explanation:"At most 2 elements can appear more than \u230An/3\u230B times. Extended Boyer-Moore: maintain a map of at most 2 candidates. When a 3rd distinct value appears, decrement every candidate's count and evict any that hit zero. The survivors are potential majority elements \u2014 verify them in a second pass.",highlightLine:4,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{}},variables:[{name:"n/3 threshold",value:Math.floor(i.length/3)}]});for(let t=0;t<i.length;t++){let a=i[t];r[a]=(r[a]??0)+1;let e=()=>y({},r);if(Object.keys(r).length<=2)u.push({explanation:`i=${t}, nums[i]=${a}: freqCount[${a}] = ${r[a]}. Map has ${Object.keys(r).length} candidate(s) \u2014 no eviction needed.`,highlightLine:6,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===t?"active":l<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:e()},variables:[{name:"n",value:a},{name:`freqCount[${a}]`,value:r[a],highlight:!0},{name:"map size",value:Object.keys(r).length}]});else{u.push({explanation:`i=${t}, nums[i]=${a}: 3 distinct values in map \u2014 3rd candidate triggers decrement of ALL counts. This simulates cancelling out one occurrence of each.`,highlightLine:20,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===t?"active":l<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:e()},variables:[{name:"n",value:a,highlight:!0},{name:"map size",value:Object.keys(r).length},{name:"action",value:"decrement all"}]});for(let o of Object.keys(r))r[Number(o)]--;for(let o of Object.keys(r))r[Number(o)]===0&&delete r[Number(o)];u.push({explanation:`After decrement: ${Object.keys(r).length===0?"map empty":`candidates = ${JSON.stringify(r)}`}. Evicted any zero-count entries.`,highlightLine:13,state:{type:"array",cells:i.map((o,l)=>({value:o,state:l===t?"active":l<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:e()},variables:[{name:"map after evict",value:JSON.stringify(r),highlight:!0}]})}}let s=Math.floor(i.length/3),n=Object.keys(r).map(Number).filter(t=>i.filter(a=>a===t).length>s);return u.push({explanation:`Candidates after scan: ${JSON.stringify(r)}. Verify each appears > n/3 = ${i.length}/3 = ${s} times.`,highlightLine:15,state:{type:"array",cells:i.map(t=>({value:t,state:n.includes(t)?"found":"eliminated"})),pointers:[],hashmap:Object.fromEntries(Object.keys(r).map(t=>[t,`count=${i.filter(a=>a===Number(t)).length} > ${s}? ${i.filter(a=>a===Number(t)).length>s}`]))},variables:[{name:"return",value:`[${n.join(", ")}]`,highlight:!0}]}),u}var xs=`class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        # all return keys must have size bigger than minSize
        # double / for int, single / for float
        minSize = len(nums)//3

        # map of n -> freq(n)
        freqMap = defaultdict(int)

        for n in nums:
            freqMap[n] += 1

        returnList = []

        for key, value in freqMap.items():
            if value > minSize:
                returnList.append(key)

        return returnList`;function $s(){let i=[1,1,1,3,3,2,2,2],u=Math.floor(i.length/3),r=[],s={};r.push({explanation:`Frequency-map approach (the intuitive one). minSize = len(nums)//3 = ${i.length}//3 = ${u}. Count every value, then return those appearing MORE than minSize times. Uses a full map \u2014 O(n) space \u2014 vs Boyer-Moore's O(1).`,highlightLine:5,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{},hashmapLabel:"freqMap",counters:[{label:"minSize (n/3)",value:u}]},variables:[{name:"minSize",value:u}]});for(let t=0;t<i.length;t++)s[i[t]]=(s[i[t]]||0)+1,r.push({explanation:`i=${t}: freqMap[${i[t]}] \u2192 ${s[i[t]]}.`,highlightLine:11,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===t?"active":e<t?"visited":"default"})),pointers:[{index:t,label:"i"}],hashmap:y({},s),hashmapLabel:"freqMap",counters:[{label:"minSize (n/3)",value:u}]},variables:[{name:"i",value:t},{name:`freqMap[${i[t]}]`,value:s[i[t]],highlight:!0}]});let n=[];for(let t of Object.keys(s).map(Number)){let a=s[t],e=a>u;e&&n.push(t),r.push({explanation:`Check key ${t}: count = ${a}. ${e?`${a} > ${u} \u2192 include ${t} in the result.`:`${a} \u2264 ${u} \u2192 exclude.`}`,highlightLine:16,state:{type:"array",cells:i.map(o=>({value:o,state:o===t?e?"found":"eliminated":"visited"})),pointers:[],hashmap:y({},s),hashmapLabel:"freqMap",counters:[{label:"minSize (n/3)",value:u}]},variables:[{name:"key",value:t,highlight:!0},{name:"count",value:a},{name:`> ${u}?`,value:e?"yes":"no",highlight:e}]})}return r.push({explanation:`Done. Keys with count > ${u}: [${n.join(", ")}]. Return them. O(n) time and O(n) space \u2014 the Boyer-Moore variant gets this down to O(1) space.`,highlightLine:19,state:{type:"array",cells:i.map(t=>({value:t,state:n.includes(t)?"found":"eliminated"})),pointers:[],hashmap:y({},s),hashmapLabel:"freqMap",counters:[{label:"minSize (n/3)",value:u}]},variables:[{name:"return",value:`[${n.join(", ")}]`,highlight:!0}]}),r}var ks={label:"Frequency Map",pythonCode:xs,generateSteps:$s,timeComplexity:"O(n)",spaceComplexity:"O(n)"},Ss={label:"Extended Boyer-Moore",pythonCode:bs,generateSteps:ws,timeComplexity:"O(n)",spaceComplexity:"O(1)"},rt={id:"majority-element-ii",lcNumber:229,title:"Majority Element II",difficulty:"Medium",category:"arrays-hash",tags:["Array","Hash Map","Boyer-Moore"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array of size n, find all elements that appear more than \u230An/3\u230B times. There can be at most two such elements.",examples:[{input:"nums = [3,2,3]",output:"[3]"},{input:"nums = [1,1,1,3,3,2,2,2]",output:"[1,2]"}],constraints:["1 \u2264 nums.length \u2264 5 \xD7 10\u2074","-10\u2079 \u2264 nums[i] \u2264 10\u2079"],hint:'Extension of Boyer-Moore: at most 2 elements can exceed n/3. Keep a map of at most 2 candidates. When a 3rd distinct value appears, decrement all counts and evict zeros \u2014 this "cancels" one occurrence of each candidate against the new value. After the scan, do a verification pass to confirm real counts exceed n/3.',solutions:[ks,Ss]};var Ls=`class Solution:
    def hasCycleHashSet(self, head: Optional[ListNode]) -> bool:
        # store visited nodes in a set
        # if we see the same node again, cycle detected
        seen = set()
        current = head
        while current:
            if current in seen:
                return True
            seen.add(current)
            current = current.next
        return False`;function Os(){let i=[3,2,0,-4],u=[],r=(t,a)=>i.map((e,o)=>({id:`n${o}`,value:e,nextId:o<i.length-1?`n${o+1}`:null,state:o===t?"curr":a.has(o)?"done":"default"}));u.push({explanation:"Hash Set approach: traverse nodes and store each in a set. If we encounter a node already in the set, we have a cycle. List: [3\u21922\u21920\u2192-4\u2192(back to 2)]. The tail (-4) points back to index 1 (node 2).",highlightLine:2,state:{type:"linked-list",nodes:r(null,new Set),pointers:[{nodeId:"n0",label:"head"}]},variables:[{name:"seen",value:"{}"}]});let s=new Set,n=0;for(;n<i.length;){if(s.has(n)){u.push({explanation:`current = node(${i[n]}) is already in seen! Cycle detected. Return True.`,highlightLine:8,state:{type:"linked-list",nodes:r(n,s),pointers:[{nodeId:`n${n}`,label:"current"}]},variables:[{name:"current.val",value:i[n],highlight:!0},{name:"in seen?",value:"YES \u2192 cycle!",highlight:!0}]});break}u.push({explanation:`current = node(${i[n]}). Not in seen \u2014 add it. seen = {${[...s,n].map(t=>i[t]).join(", ")}}.`,highlightLine:9,state:{type:"linked-list",nodes:r(n,s),pointers:[{nodeId:`n${n}`,label:"current"}]},variables:[{name:"current.val",value:i[n],highlight:!0},{name:"seen size",value:s.size+1}]}),s.add(n),n===i.length-1?n=1:n++}return u}var Cs=`class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        # floyd's cycle detection algorithm
        slow = fast = head

        # we should traverse if fast has reached the end, not slow
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            # will eventually meet if cycle
            if slow == fast:
                return True

        return False`;function Ms(){let i=[3,2,0,-4],u=[],r=e=>e===3?1:e<i.length-1?e+1:-1,s=(e,o)=>i.map((l,h)=>({id:`n${h}`,value:l,nextId:h<i.length-1?`n${h+1}`:null,state:h===e&&h===o?"active":h===e?"curr":h===o?"next-node":"default"}));u.push({explanation:"Floyd's tortoise and hare: slow moves 1 step, fast moves 2 steps. If there's a cycle, fast will lap slow and they'll meet. If no cycle, fast reaches null first. List: [3\u21922\u21920\u2192-4\u2192(back to 2)]. The cycle means -4's next pointer goes back to node 2.",highlightLine:3,state:{type:"linked-list",nodes:s(0,0),pointers:[{nodeId:"n0",label:"slow"},{nodeId:"n0",label:"fast"}]},variables:[{name:"slow.val",value:i[0]},{name:"fast.val",value:i[0]}]});let n=0,t=0,a=0;for(;;){let e=r(n),o=r(t),l=o===-1?-1:r(o);if(e===-1||l===-1){u.push({explanation:"fast (or fast.next) is null \u2014 no cycle detected. Return False.",highlightLine:11,state:{type:"linked-list",nodes:s(n,t),pointers:[{nodeId:`n${n}`,label:"slow"},{nodeId:t!==-1?`n${t}`:null,label:"fast"}]},variables:[{name:"return",value:"False",highlight:!0}]});break}let h=e,d=l;if(a++,u.push({explanation:`Iteration ${a}: slow(${i[n]}) \u2192 slow(${i[h]}) [+1]. fast(${i[t]}) \u2192 fast(${i[d]}) [+2 via ${i[o]}]. ${h===d?"slow == fast! Cycle confirmed \u2192 return True.":"No meeting yet."}`,highlightLine:h===d?9:6,state:{type:"linked-list",nodes:s(h,d),pointers:[{nodeId:`n${h}`,label:"slow"},{nodeId:`n${d}`,label:"fast"}]},variables:[{name:"slow.val",value:i[h],highlight:h===d},{name:"fast.val",value:i[d],highlight:h===d},{name:"slow == fast?",value:h===d?"YES \u2192 cycle!":"no",highlight:h===d}]}),n=h,t=d,n===t)break}return u}var Ts={label:"Hash Set",pythonCode:Ls,generateSteps:Os},Ns={label:"Floyd's Cycle Detection",pythonCode:Cs,generateSteps:Ms},lt={id:"linked-list-cycle",lcNumber:141,title:"Linked List Cycle",difficulty:"Easy",category:"linked-list",tags:["Linked List","Two Pointers","Floyd's"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given head, the head of a linked list, determine if the linked list has a cycle in it. Return true if there is a cycle in the linked list, otherwise return false.",examples:[{input:"head = [3,2,0,-4], pos = 1",output:"true",explanation:"There is a cycle where the tail connects to the node at index 1."},{input:"head = [1,2], pos = 0",output:"true",explanation:"There is a cycle where the tail connects to the node at index 0."},{input:"head = [1], pos = -1",output:"false",explanation:"There is no cycle in the linked list."}],constraints:["The number of nodes in the list is in the range [0, 10\u2074].","-10\u2075 \u2264 Node.val \u2264 10\u2075","pos is -1 or a valid index in the linked list."],hint:"Floyd's cycle detection: use two pointers \u2014 slow moves 1 step, fast moves 2 steps. If fast ever equals slow (after the start), there's a cycle. This runs in O(n) time and O(1) space, beating the hash set approach's O(n) space.",solutions:[Ts,Ns]};var Is=`class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        # naive solution is to make a hashmap
        # we can just loop through the list, construct hashmap of index -> node
        # build new linked list with result
        # L(0) -> L(n) -> L(1) -> L(n-1) -> L(2) -> L(n - 2)
        # effectively we are merging L(n/2) with the reverse top half of L(n/2) interchangeably
        # so first step is to find the middle of the linked list
        # for this, we do floyd's cycle detection which puts slow at the middle
        # then we reverse the second half of the linked list in place
        # then we loop through with two pointers, one at beginning, one at middle and assign interchangeably
        # also if we look at 1->2->3->4->5, we will notice that first half is 1,2,3 and second half is 4,5
        # thus we can't use slow node from floyd's algorithm, we need slow.next for second half
        # what an amazing problem!! floyd/reverse/merge all in one

        # starting slow

        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        # slow = middle of list
        # slow.next = start of second half of list
        current = slow.next
        # split the two lists
        slow.next = None
        prev = None

        while current:
            temp = current.next
            current.next = prev
            prev = current
            current = temp

        # now that we have reversed, we just need to interchangeably swap the nodes
        # current is null, prev is the actual new head of secondHalf

        firstHalf, secondHalf = head, prev

        # from 1,2,3,4,5, we know secondHalf is shorter
        # thus we loop based on secondHalf

        # 1,2,3
        # 5,4
        while secondHalf:
            # like in all reordering problems, we store next for all lists we traverse
            tmp1, tmp2 = firstHalf.next, secondHalf.next
            # 1.next = 5
            firstHalf.next = secondHalf
            # 5.next = 2
            secondHalf.next = tmp1
            firstHalf = tmp1
            secondHalf = tmp2`;function qs(){let i=[1,2,3,4,5],u=[],r=(g,v)=>g.map((w,b)=>({id:`n${b}`,value:w,nextId:b<g.length-1?`n${b+1}`:null,state:v[b]??"default"}));u.push({explanation:"Reorder [1\u21922\u21923\u21924\u21925] to [1\u21925\u21922\u21924\u21923]. Algorithm has 3 phases: (1) find the middle using slow/fast pointers, (2) reverse the second half in-place, (3) interleave-merge the two halves.",highlightLine:1,state:{type:"linked-list",nodes:r(i,{}),pointers:[{nodeId:"n0",label:"head"}]},variables:[]}),u.push({explanation:"Phase 1 \u2014 Find Middle. slow and fast start at head. slow advances 1 step, fast advances 2 steps per iteration. When fast reaches the end, slow is at the middle.",highlightLine:18,state:{type:"linked-list",nodes:r(i,{0:"curr"}),pointers:[{nodeId:"n0",label:"slow"},{nodeId:"n0",label:"fast"}]},variables:[{name:"slow.val",value:i[0]},{name:"fast.val",value:i[0]}]});let s=0,n=0;for(;n<i.length-1&&n+1<i.length-1;)s++,n+=2,u.push({explanation:`slow \u2192 ${i[s]}, fast \u2192 ${n<i.length?i[n]:"null"} (moved 2 steps). fast still has next \u2014 continue.`,highlightLine:19,state:{type:"linked-list",nodes:r(i,{[s]:"curr",[n]:"next-node"}),pointers:[{nodeId:`n${s}`,label:"slow"},{nodeId:n<i.length?`n${n}`:null,label:"fast"}]},variables:[{name:"slow.val",value:i[s],highlight:!0},{name:"fast.val",value:n<i.length?i[n]:"null",highlight:!0}]});u.push({explanation:`fast.next is null \u2014 slow is at the middle (node ${i[s]}). The second half starts at slow.next (node ${i[s+1]}). We cut the list here: slow.next = None.`,highlightLine:23,state:{type:"linked-list",nodes:r(i,{[s]:"active"}),pointers:[{nodeId:`n${s}`,label:"slow (middle)"}]},variables:[{name:"slow.val",value:i[s],highlight:!0},{name:"slow.next",value:i[s+1]}]});let t=s,a=i.slice(0,t+1),e=i.slice(t+1);u.push({explanation:`Phase 2 \u2014 Reverse second half [${e.join("\u2192")}]. We reverse in-place using prev/current pointers. Result will be [${[...e].reverse().join("\u2192")}].`,highlightLine:27,state:{type:"linked-list",nodes:[...a.map((g,v)=>({id:`n${v}`,value:g,nextId:v<a.length-1?`n${v+1}`:null,state:"default"})),...e.map((g,v)=>({id:`s${v}`,value:g,nextId:v<e.length-1?`s${v+1}`:null,state:v===0?"curr":"default"}))],pointers:[{nodeId:"s0",label:"current"},{nodeId:null,label:"prev"}]},variables:[{name:"current.val",value:e[0]},{name:"prev",value:"None"}]});let o=[...e].reverse(),l=e.map((g,v)=>`s${v}`),h={},d={};e.forEach((g,v)=>{h[l[v]]=g,d[l[v]]=v<l.length-1?l[v+1]:null});let c=()=>a.map((g,v)=>({id:`n${v}`,value:g,nextId:v<a.length-1?`n${v+1}`:null,state:"default"})),p=(g,v)=>{let w=[];for(let b=g;b;b=d[b])w.push(b);for(let b=v;b;b=d[b])w.push(b);return w.map(b=>({id:b,value:h[b],nextId:d[b],state:b===v?"curr":b===g?"active":"done"}))};{let g=null,v=l[0],w=0;for(;v;){w++;let b=d[v];d[v]=g;let $=h[v];u.push({explanation:`Reverse iteration ${w}: temp = current.next = ${b?h[b]:"null"}. Point current (${$}).next back to prev (${g?h[g]:"None"}). Then advance: prev \u2192 ${$}, current \u2192 ${b?h[b]:"null"}.`,highlightLine:31,state:{type:"linked-list",nodes:[...c(),...p(v,b)],pointers:[{nodeId:v,label:"prev (new head)"},{nodeId:b,label:"current"}]},variables:[{name:"current",value:$,highlight:!0},{name:"prev",value:g?h[g]:"None"},{name:"temp",value:b?h[b]:"null"}]}),g=v,v=b}u.push({explanation:`current is null \u2014 reversal done. prev (node ${h[g]}) is the new head of the second half: [${o.join("\u2192")}].`,highlightLine:31,state:{type:"linked-list",nodes:[...c(),...p(g,null)],pointers:[{nodeId:"n0",label:"head (firstHalf)"},{nodeId:g,label:"prev (secondHalf)"}]},variables:[{name:"firstHalf",value:a.join("\u2192")},{name:"secondHalf",value:o.join("\u2192"),highlight:!0}]})}u.push({explanation:"Phase 3 \u2014 Interleave merge. firstHalf = [1\u21922\u21923], secondHalf = [5\u21924]. We alternate: take one from firstHalf, then one from secondHalf, repeating until secondHalf is exhausted.",highlightLine:37,state:{type:"linked-list",nodes:[...a.map((g,v)=>({id:`n${v}`,value:g,nextId:v<a.length-1?`n${v+1}`:null,state:v===0?"curr":"default"})),...o.map((g,v)=>({id:`r${v}`,value:g,nextId:v<o.length-1?`r${v+1}`:null,state:v===0?"next-node":"default"}))],pointers:[{nodeId:"n0",label:"firstHalf"},{nodeId:"r0",label:"secondHalf"}]},variables:[{name:"firstHalf",value:a.join("\u2192")},{name:"secondHalf",value:o.join("\u2192")}]});let m=[1,5,2,4,3],f=[{done:[1,5],f:2,s:4,explanation:"Place 1, then 5 after it (1\u21925). Advance firstHalf to 2, secondHalf to 4."},{done:[1,5,2,4],f:3,s:null,explanation:"Place 2, then 4 after it (\u2026\u21922\u21924). Advance firstHalf to 3, secondHalf exhausted."},{done:[1,5,2,4,3],f:null,s:null,explanation:"secondHalf is null \u2014 loop ends. firstHalf (3) remains as the tail. Result: [1\u21925\u21922\u21924\u21923]."}];for(let g of f){let v=g.done.concat(g.f!==null?[g.f]:[]).concat(g.s!==null?[g.s]:[]),w=new Set(g.done);u.push({explanation:g.explanation,highlightLine:46,state:{type:"linked-list",nodes:m.map((b,$)=>({id:`m${$}`,value:b,nextId:$<m.length-1?`m${$+1}`:null,state:w.has(b)?"done":b===g.f?"curr":b===g.s?"next-node":"default"})),pointers:[...g.f!==null?[{nodeId:`m${m.indexOf(g.f)}`,label:"firstHalf"}]:[],...g.s!==null?[{nodeId:`m${m.indexOf(g.s)}`,label:"secondHalf"}]:[]]},variables:[{name:"firstHalf",value:g.f??"null"},{name:"secondHalf",value:g.s??"null"}]})}return u}var Rs={label:"Find Middle + Reverse + Merge",pythonCode:Is,generateSteps:qs},ot={id:"reorder-list",lcNumber:143,title:"Reorder List",difficulty:"Medium",category:"linked-list",tags:["Linked List","Two Pointers","Stack"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"You are given the head of a singly linked-list L0 \u2192 L1 \u2192 \u2026 \u2192 Ln-1 \u2192 Ln. Reorder it to: L0 \u2192 Ln \u2192 L1 \u2192 Ln-1 \u2192 L2 \u2192 Ln-2 \u2192 \u2026 You may not modify the values in the nodes \u2014 only nodes themselves may be changed.",examples:[{input:"head = [1,2,3,4]",output:"[1,4,2,3]"},{input:"head = [1,2,3,4,5]",output:"[1,5,2,4,3]"}],constraints:["The number of nodes in the list is in the range [1, 5\xD710\u2074].","1 \u2264 Node.val \u2264 1000"],hint:"Three-phase O(n) approach: (1) find the middle with slow/fast pointers \u2014 slow ends at the midpoint; (2) reverse the second half in-place; (3) interleave-merge first half with reversed second half, always advancing secondHalf until it is null.",solutions:[Rs]};var Ps=`class Solution:
    def findMin(self, nums: List[int]) -> int:
        # similar to searching for an element in a rotated array
        # we use l < r instead of l <= r like in normal binary search
        # when we did find an element in rotated array, we found where the array was rotated then binary searched on the 2 halves
        # this problem is just the first part of that
        # index l will be start of original array and that's our answer
        l, r = 0, len(nums) - 1

        while l < r:
            mid = (l + r) // 2
            # if mid > r, then l = m + 1
            if nums[mid] > nums[r]:
                l = mid + 1
            else:
                r = mid
        return nums[l]`;function As(){let i=[3,4,5,1,2],u=[],r=(t,a,e,o)=>i.map((l,h)=>({value:l,state:o!==null&&h===o?"min-ptr":o!==null?"eliminated":h===e?"active":h>=t&&h<=a?"window":"eliminated"}));u.push({explanation:"Find the minimum in a rotated sorted array [3,4,5,1,2] in O(log n). Key insight: compare nums[mid] vs nums[r]. If nums[mid] > nums[r], the minimum must be to the right of mid (left half is ascending and larger). Otherwise the minimum is at mid or to the left.",highlightLine:8,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[]},variables:[{name:"nums",value:"[3,4,5,1,2]"}]});let s=0,n=i.length-1;for(u.push({explanation:`Initialize l=${s}, r=${n}. We use l < r (not l \u2264 r) because we want to converge on the minimum without overshooting \u2014 when l === r, that index is the answer.`,highlightLine:8,state:{type:"array",cells:r(s,n,null,null),pointers:[{index:s,label:"l"},{index:n,label:"r"}]},variables:[{name:"l",value:s},{name:"r",value:n}]});s<n;){let t=Math.floor((s+n)/2),a=i[t]>i[n];u.push({explanation:`l=${s}, r=${n}, mid=${t}: nums[mid]=${i[t]} ${a?">":"\u2264"} nums[r]=${i[n]}. ${a?"The left half [l..mid] is ascending and all > nums[r], so the minimum is right of mid \u2192 l = mid+1.":"The minimum could be at mid or to the left \u2192 r = mid (keep mid as candidate)."}`,highlightLine:a?13:15,state:{type:"array",cells:r(s,n,t,null),pointers:[{index:s,label:"l"},{index:t,label:"mid"},{index:n,label:"r"}]},variables:[{name:"mid",value:t},{name:"nums[mid]",value:i[t]},{name:"nums[r]",value:i[n]},{name:a?"l \u2192":"r \u2192",value:a?t+1:t,highlight:!0}]}),a?s=t+1:n=t}return u.push({explanation:`l === r === ${s}. Converged! nums[${s}] = ${i[s]} is the minimum. It's the start of the original sorted array before rotation. O(log n) time, O(1) space.`,highlightLine:16,state:{type:"array",cells:r(s,n,null,s),pointers:[{index:s,label:"min"}]},variables:[{name:"l",value:s},{name:"return",value:i[s],highlight:!0}]}),u}var js={label:"Binary Search on Minimum",pythonCode:Ps,generateSteps:As},ut={id:"find-minimum-in-rotated-sorted-array",lcNumber:153,title:"Find Minimum in Rotated Sorted Array",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(log n)",spaceComplexity:"O(1)",description:"Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array. You must write an algorithm that runs in O(log n) time.",examples:[{input:"nums = [3,4,5,1,2]",output:"1",explanation:"The original array was [1,2,3,4,5] rotated 3 times."},{input:"nums = [4,5,6,7,0,1,2]",output:"0",explanation:"The original array was [0,1,2,4,5,6,7] rotated 4 times."},{input:"nums = [11,13,15,17]",output:"11",explanation:"The array is rotated 4 times (full rotation), minimum is at index 0."}],constraints:["n == nums.length","1 \u2264 n \u2264 5000","-5000 \u2264 nums[i] \u2264 5000","All the integers of nums are unique.","nums is sorted and rotated between 1 and n times."],hint:"Compare nums[mid] with nums[r]: if nums[mid] > nums[r] the minimum is strictly in the right half (l = mid+1); otherwise the minimum is at mid or left (r = mid). Use l < r so you converge without overshooting.",solutions:[js]};var Es=`class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        # basically we are looking for some form of s1 in s2
        # we can just assume a window of size s1
        # permutation is same as anagram, so we can just do map of frequency
        # so we start with s1FreqMap
        # go through the window of s1 in s2, compare s1FreqMap vs s2FreqMap and return
        # problem is that map comparison is O(n) so this solution is O(n*m) where n is size of s2 and m is size of s1
        # if instead of a map, we use an array of size 26 due to constraint of lowercase English letters
        # we can reduce comparison to O(26) so we get O(n)

        def compareS1andS2() -> bool:
            for i in range(26):
                if s1Array[i] != s2Array[i]:
                    return False
            return True

        s1Array = [0] * 26
        s2Array = [0] * 26

        l = r = 0

        # invalid query if s1 > s2

        if len(s1) > len(s2):
            return False

        # populate s1Array with frequency from s1

        for i in range(len(s1)):
            s1Array[ord(s1[i]) - ord('a')] += 1

        # now we go through s2 with sliding window and increment/decrement from s2Array

        while r < len(s2):
            s2Array[ord(s2[r]) - ord('a')] += 1
            # make sure size of window isn't bigger than size of s1
            # this is never actually going to run to O(len(s1)) since it runs every iteration
            # it will at most be ran 1 iteration each outer iteration
            while r - l + 1 > len(s1):
                s2Array[ord(s2[l]) - ord('a')] -= 1
                l+=1
            # now that we are valid, compare the two arrays
            if compareS1andS2():
                return True
            r+=1
        return False`;function Fs(){let u="eidbaooo",s=[],n=new Array(26).fill(0);for(let h of"ab")n[h.charCodeAt(0)-97]++;let t={};for(let h of"ab")t[h]=(t[h]??0)+1;let a=(h,d,c)=>u.split("").map((p,m)=>({value:p,state:c&&m>=h&&m<=d?"found":m>=h&&m<=d?"window":m<h?"eliminated":"default"})),e=(h,d)=>{let c={};for(let p=h;p<=d;p++){let m=u[p];c[m]=(c[m]??0)+1}return c},o=(h,d)=>{let c=e(h,d);for(let p of"ab")if((c[p]??0)!==n[p.charCodeAt(0)-97])return!1;for(let p of Object.keys(c))if(!t[p])return!1;return!0};s.push({explanation:'Check if s2="eidbaooo" contains a permutation of s1="ab". A permutation has the same character frequencies. Strategy: use a fixed-size sliding window of size 2 (= len(s1)), comparing frequency arrays at each position. Using 26-char arrays instead of maps brings window comparison to O(26) = O(1).',highlightLine:1,state:{type:"array",cells:u.split("").map(h=>({value:h,state:"default"})),pointers:[],hashmap:t},variables:[{name:"s1",value:"ab"},{name:"s2",value:u},{name:"window size",value:2}]}),s.push({explanation:`Build s1Freq: count each character of s1. s1Freq = {${Object.entries(t).map(([h,d])=>`'${h}':${d}`).join(", ")}}. This is our target frequency to match.`,highlightLine:30,state:{type:"array",cells:u.split("").map(h=>({value:h,state:"default"})),pointers:[],hashmap:t},variables:[{name:"s1Freq",value:JSON.stringify(t)}]});let l=0;for(let h=0;h<u.length;h++){h-l+1>2&&l++;let c=h-l+1,p=e(l,h),m=c===2&&o(l,h),f={};for(let g=l;g<=h;g++){let v=u[g];f[v]=(f[v]??0)+1}if(s.push({explanation:m?`Window [${l}..${h}] = "${u.slice(l,h+1)}". s2Freq = {${Object.entries(f).map(([g,v])=>`'${g}':${v}`).join(", ")}} matches s1Freq! Permutation found \u2014 return True.`:`Window [${l}..${h}] = "${u.slice(l,h+1)}" (size ${c}). s2Freq = {${Object.entries(f).map(([g,v])=>`'${g}':${v}`).join(", ")}} \u2260 s1Freq. Slide window right.`,highlightLine:m?42:34,state:{type:"array",cells:a(l,h,m),pointers:[{index:l,label:"l"},{index:h,label:"r"}],hashmap:f},variables:[{name:"l",value:l},{name:"r",value:h},{name:"window",value:u.slice(l,h+1)},{name:"match?",value:m?"YES":"no",highlight:m}]}),m)return s}return s.push({explanation:"Exhausted s2 without finding a match. Return False.",highlightLine:44,state:{type:"array",cells:u.split("").map(h=>({value:h,state:"eliminated"})),pointers:[]},variables:[{name:"return",value:"False",highlight:!0}]}),s}var Ds={label:"Fixed-Size Sliding Window + Freq Array",pythonCode:Es,generateSteps:Fs},ht={id:"permutation-in-string",lcNumber:567,title:"Permutation in String",difficulty:"Medium",category:"sliding-window",tags:["Hash Map","Sliding Window","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise. In other words, return true if one of s1's permutations is a substring of s2.",examples:[{input:'s1 = "ab", s2 = "eidbaooo"',output:"true",explanation:'s2 contains one permutation of s1 ("ba" at index 3).'},{input:'s1 = "ab", s2 = "eidboaoo"',output:"false"}],constraints:["1 \u2264 s1.length, s2.length \u2264 10\u2074","s1 and s2 consist of lowercase English letters."],hint:"A permutation has the same character frequencies. Use a fixed-size sliding window of length len(s1) over s2 and compare frequency arrays at each position. Replace the hash map with a 26-element array indexed by ord(c) - ord('a') to make each comparison O(1).",solutions:[Ds]};var Bs=`class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        # ok so this is pretty much identical to number of islands
        # but difference is that we need to keep track of how many nodes are part of the island
        # so let's try for a DFS approach first
        # What DFS/BFS means is that it will look at every node in this current island
        # thus what we should be returning from DFS is +1 from each traversal if it hits
        # we need a visited

        visited = set()
        maxArea = 0

        rows, cols = len(grid), len(grid[0])

        def dfs(row,col):
            # base cases

            # if out of bound, 0
            if row < 0 or row >= rows or col < 0 or col >= cols:
                return 0

            # if water, 0
            if grid[row][col] == 0:
                return 0

            # if visited, 0
            if (row,col) in visited:
                return 0

            # if not, then new node
            # we add it to visited and increment size of our current island
            visited.add((row,col))
            return 1+dfs(row+1,col)+dfs(row-1,col)+dfs(row,col+1)+dfs(row,col-1)

        for row in range(rows):
            for col in range(cols):
                # if we found land, we will get its size and compare to maxArea
                if grid[row][col] == 1 and (row,col) not in visited:
                    maxArea = max(maxArea, dfs(row,col))

        return maxArea`,ae=[[0,1,1,0,0],[0,1,0,0,0],[0,0,0,1,1],[0,0,0,1,0],[0,0,0,1,0]],dt=ae.length,ct=ae[0].length;function te(i,u,r){return{type:"grid",grid:ae.map((s,n)=>s.map((t,a)=>{let e=`${n},${a}`;return r.has(e)?{state:"queued"}:u.has(e)?{state:"fresh"}:i.has(e)?{state:"visited"}:t===1?{state:"land"}:{state:"water"}}))}}function Hs(){let i=[],u=new Set,r=0,s=new Set,n=(e,o)=>`${e},${o}`,t=[[1,0],[-1,0],[0,1],[0,-1]];i.push({explanation:"Max Area of Island: scan each cell. When unvisited land is found, DFS to count all connected land cells. Track the maximum area seen. Grid has two islands \u2014 the left-side island (area 3) and the right-side island (area 4).",highlightLine:10,state:te(u,new Set,new Set),variables:[{name:"maxArea",value:0},{name:"visited",value:0}]});function a(e,o,l){if(e<0||e>=dt||o<0||o>=ct||ae[e][o]===0)return 0;let h=n(e,o);return u.has(h)?0:(u.add(h),l.add(h),i.push({explanation:`DFS at (${e},${o}) = land, unvisited. Add to visited. Current island size so far: ${l.size}.`,highlightLine:32,state:te(u,l,new Set),variables:[{name:"row",value:e,highlight:!0},{name:"col",value:o,highlight:!0},{name:"island size",value:l.size},{name:"maxArea",value:r}]}),1+a(e+1,o,l)+a(e-1,o,l)+a(e,o+1,l)+a(e,o-1,l))}for(let e=0;e<dt;e++)for(let o=0;o<ct;o++){let l=n(e,o);if(ae[e][o]===1&&!u.has(l)){let h=new Set;i.push({explanation:`Outer scan found unvisited land at (${e},${o}). Starting DFS to measure this island.`,highlightLine:38,state:te(u,new Set([l]),new Set),variables:[{name:"row",value:e,highlight:!0},{name:"col",value:o,highlight:!0},{name:"maxArea",value:r}]});let d=a(e,o,h),c=d>r;c&&(r=d,s.clear(),h.forEach(p=>s.add(p))),i.push({explanation:`Island at (${e},${o}) has area ${d}. ${c?`New maximum! maxArea updated to ${d}.`:`maxArea stays at ${r}.`} Max island cells highlighted in orange.`,highlightLine:39,state:te(u,new Set,new Set(s)),variables:[{name:"area",value:d,highlight:!0},{name:"maxArea",value:r,highlight:c}]})}}return i.push({explanation:`Scan complete. Maximum island area = ${r}. The orange cells show the largest island. DFS visited each cell at most once \u2192 O(m\xD7n) time and O(m\xD7n) space for the visited set.`,highlightLine:41,state:te(u,new Set,s),variables:[{name:"maxArea",value:r,highlight:!0},{name:"visited",value:`${u.size} cells`}]}),i}var _s={label:"DFS with Visited Set",pythonCode:Bs,generateSteps:Hs},pt={id:"max-area-of-island",lcNumber:695,title:"Max Area of Island",difficulty:"Medium",category:"graphs",tags:["BFS","DFS","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"You are given an m \xD7 n binary matrix grid. An island is a group of 1s connected 4-directionally. The area of an island is the number of cells with value 1 in the island. Return the maximum area of an island in grid, or 0 if there is no island.",examples:[{input:"grid = [[0,0,1,0,0],[0,1,1,0,0],[0,1,0,0,0],[0,0,0,1,1]]",output:"4",explanation:"The largest island has 4 connected land cells."},{input:"grid = [[0,0,0,0,0,0,0,0]]",output:"0",explanation:"No land cells exist."}],constraints:["m == grid.length","n == grid[i].length","1 \u2264 m, n \u2264 50","grid[i][j] is either 0 or 1."],hint:"Like Number of Islands but DFS returns the count instead of just marking visited. Each DFS call returns 1 + sum of all neighbor DFS calls, propagating island size back up the call stack.",solutions:[_s]};var Ws=`class Solution:
    def reverseString(self, s: List[str]) -> None:
        l, r = 0, len(s) - 1
        while r>l:
            s[l], s[r] = s[r], s[l]
            r-=1
            l+=1`;function zs(){let i=["h","e","l","l","o"],u=[],r=(a,e,o,l)=>i.map((h,d)=>({value:h,state:l?"found":o.has(d)&&d!==a&&d!==e?"visited":d===a||d===e?"active":"default"})),s=new Set;u.push({explanation:'Reverse string ["h","e","l","l","o"] in-place using two pointers. l starts at the left end, r at the right end. Each step swaps s[l] and s[r] then moves both pointers inward. O(n) time, O(1) space.',highlightLine:2,state:{type:"array",cells:i.map(a=>({value:a,state:"default"})),pointers:[]},variables:[{name:"s",value:'["h","e","l","l","o"]'}]});let n=0,t=i.length-1;for(u.push({explanation:`Initialize l=${n}, r=${t}. Two pointers face inward \u2014 we swap while r > l.`,highlightLine:2,state:{type:"array",cells:r(n,t,s,!1),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n},{name:"r",value:t}]});t>n;){let a=i[n],e=i[t];u.push({explanation:`r=${t} > l=${n}: swap s[${n}]='${a}' and s[${t}]='${e}'.`,highlightLine:3,state:{type:"array",cells:r(n,t,s,!1),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n},{name:"r",value:t},{name:"s[l]",value:a,highlight:!0},{name:"s[r]",value:e,highlight:!0}]}),i[n]=e,i[t]=a,s.add(n),s.add(t),t--,n++,u.push({explanation:`Swapped \u2192 s[${n-1}]='${i[n-1]}', s[${t+1}]='${i[t+1]}'. Move l\u2192${n}, r\u2192${t}.`,highlightLine:4,state:{type:"array",cells:r(n,t,s,!1),pointers:t>=n?[{index:n,label:"l"},{index:t,label:"r"}]:[{index:n,label:"l=r"}]},variables:[{name:"l",value:n},{name:"r",value:t}]})}return u.push({explanation:`r=${t} \u2264 l=${n}: done. Reversed string is ["${i.join('","')}"].`,highlightLine:6,state:{type:"array",cells:r(n,t,s,!0),pointers:[]},variables:[{name:"result",value:`["${i.join('","')}"]`,highlight:!0}]}),u}var Ys={label:"Two Pointers",pythonCode:Ws,generateSteps:zs},mt={id:"reverse-string",lcNumber:344,title:"Reverse String",difficulty:"Easy",category:"two-pointers",tags:["Two Pointers","String"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.",examples:[{input:'s = ["h","e","l","l","o"]',output:'["o","l","l","e","h"]'},{input:'s = ["H","a","n","n","a","h"]',output:'["h","a","n","n","a","H"]'}],constraints:["1 \u2264 s.length \u2264 10\u2075","s[i] is a printable ASCII character."],hint:"Place l at index 0 and r at index n-1. While r > l, swap s[l] and s[r], then increment l and decrement r. Each swap places two characters in their final positions, so n/2 swaps suffice.",solutions:[Ys]};var Gs=`class Solution:
    def plusOneSolution1(self, digits: List[int]) -> List[int]:
        # iterate from last number in list
        # if digit is 9, set to 0 and continue
        # otherwise, add 1 and return
        # if we are out of loop without returning, it means it was all 9s
        # thus we add 1 in front of list

        # range(start, end, increment)
        for i in range(len(digits)-1,-1,-1):
            if digits[i] != 9:
                digits[i] += 1
                return digits
            digits[i] = 0

        return [1] + digits`;function Vs(){let i=[1,2,9],u=[];u.push({explanation:"Plus One on [1,2,9]: add 1 to the integer represented as an array of digits. Walk from the rightmost digit. If it's 9, set it to 0 (carry) and continue left. Otherwise add 1 and return. If all digits were 9, prepend a 1.",highlightLine:10,state:{type:"array",cells:i.map(n=>({value:n,state:"default"})),pointers:[]},variables:[{name:"digits",value:"[1,2,9]"}]});let r=i.length-1;for(;r>=0;){let n=i[r];if(u.push({explanation:`i=${r}: digits[${r}]=${n}. ${n!==9?`Not 9 \u2192 increment to ${n+1} and return.`:"It's 9 \u2192 set to 0 (carry over), continue left."}`,highlightLine:n!==9?10:12,state:{type:"array",cells:i.map((t,a)=>({value:t,state:a===r?"active":a>r?"visited":"default"})),pointers:[{index:r,label:"i"}]},variables:[{name:"i",value:r},{name:"digits[i]",value:n,highlight:!0},{name:"is 9?",value:n===9?"yes \u2192 set 0":"no \u2192 +1 & return"}]}),n!==9)return i[r]+=1,u.push({explanation:`digits[${r}] incremented to ${i[r]}. Result: [${i.join(",")}]. Return.`,highlightLine:11,state:{type:"array",cells:i.map((t,a)=>({value:t,state:"found"})),pointers:[]},variables:[{name:"return",value:`[${i.join(",")}]`,highlight:!0}]}),u;i[r]=0,u.push({explanation:`Set digits[${r}] = 0. Carry propagates left.`,highlightLine:13,state:{type:"array",cells:i.map((t,a)=>({value:t,state:a===r||a>r?"visited":"default"})),pointers:r>0?[{index:r-1,label:"next i"}]:[]},variables:[{name:"digits[i]",value:0},{name:"carry",value:1,highlight:!0}]}),r--}let s=[1,...i];return u.push({explanation:`All digits were 9 and set to 0. Prepend 1 \u2192 [${s.join(",")}].`,highlightLine:16,state:{type:"array",cells:s.map(n=>({value:n,state:"found"})),pointers:[]},variables:[{name:"return",value:`[${s.join(",")}]`,highlight:!0}]}),u}var Us={label:"Carry Propagation",pythonCode:Gs,generateSteps:Vs},gt={id:"plus-one",lcNumber:66,title:"Plus One",difficulty:"Easy",category:"arrays-hash",tags:["Array","Math"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"You are given a large integer represented as an integer array digits, where each digits[i] is the i-th digit of the integer. Increment the large integer by one and return the resulting array of digits.",examples:[{input:"digits = [1,2,9]",output:"[1,3,0]",explanation:"The array represents 129. 129 + 1 = 130."},{input:"digits = [9,9,9]",output:"[1,0,0,0]",explanation:"The array represents 999. 999 + 1 = 1000 \u2014 all 9s roll over and a new leading 1 is prepended."},{input:"digits = [1,2,3]",output:"[1,2,4]",explanation:"The array represents 123. 123 + 1 = 124."}],constraints:["1 \u2264 digits.length \u2264 100","0 \u2264 digits[i] \u2264 9","digits does not contain any leading 0's."],hint:"Walk from the last digit to the first. If digits[i] != 9, just increment it and return immediately. If digits[i] == 9, set it to 0 (carry) and move left. If you exhaust the loop without returning, all digits were 9 \u2014 prepend a 1 to the array.",solutions:[Us]};var Xs=`class Solution:
    def findPeakElement(self, nums: List[int]) -> int:
        # key is that a peak must exist
        # and a peak is only applicable to its immediate neighbors
        # so knowing peaks exist, we can be greedy and assume that if nums[mid] < nums[mid + 1], then there is a peak on the right
        # this is a boundary type search where we find the first position where the condition holds

        l, r = 0, len(nums) - 1
        # min boundary binary search (find first true position)
        # is_valid(mid) = nums[mid] >= nums[mid + 1] (peak at or left of mid)
        while l < r:
            mid = l + (r - l) // 2
            if nums[mid] < nums[mid + 1]:
                l = mid + 1  # peak on right
            else:
                r = mid  # peak on left or at mid

        return l`;function Ks(){let i=[1,2,3,1],u=[],r=(t,a,e,o)=>i.map((l,h)=>({value:l,state:o!==null?h===o?"found":"eliminated":h===e?"active":h>=t&&h<=a?"window":"eliminated"}));u.push({explanation:"Find a peak element in [1,2,3,1] in O(log n). Key insight: if nums[mid] < nums[mid+1], the slope is rising right \u2014 a peak must exist to the right of mid. Otherwise, nums[mid] \u2265 nums[mid+1] means mid itself could be the peak, so we keep it.",highlightLine:6,state:{type:"array",cells:i.map(t=>({value:t,state:"default"})),pointers:[]},variables:[{name:"nums",value:"[1,2,3,1]"}]});let s=0,n=i.length-1;for(u.push({explanation:`Initialize l=${s}, r=${n}. We use l < r to converge on the peak without overshooting.`,highlightLine:8,state:{type:"array",cells:r(s,n,null,null),pointers:[{index:s,label:"l"},{index:n,label:"r"}]},variables:[{name:"l",value:s},{name:"r",value:n}]});s<n;){let t=s+Math.floor((n-s)/2),a=i[t]<i[t+1];u.push({explanation:`l=${s}, r=${n}, mid=${t}: nums[${t}]=${i[t]} ${a?"<":"\u2265"} nums[${t+1}]=${i[t+1]}. ${a?"Slope rising right \u2192 peak is strictly right of mid \u2192 l = mid+1.":"nums[mid] \u2265 nums[mid+1] \u2192 peak at mid or left \u2192 r = mid (keep mid as candidate)."}`,highlightLine:a?12:14,state:{type:"array",cells:r(s,n,t,null),pointers:[{index:s,label:"l"},{index:t,label:"mid"},{index:n,label:"r"}]},variables:[{name:"mid",value:t},{name:"nums[mid]",value:i[t]},{name:"nums[mid+1]",value:i[t+1]},{name:a?"l \u2192":"r \u2192",value:a?t+1:t,highlight:!0}]}),a?s=t+1:n=t}return u.push({explanation:`l === r === ${s}. Converged! nums[${s}] = ${i[s]} is a peak element (greater than both neighbors). Return index ${s}.`,highlightLine:16,state:{type:"array",cells:r(s,n,null,s),pointers:[{index:s,label:"peak"}]},variables:[{name:"l",value:s},{name:"return",value:s,highlight:!0}]}),u}var Qs={label:"Binary Search (Min Boundary)",pythonCode:Xs,generateSteps:Ks},ft={id:"find-peak-element",lcNumber:162,title:"Find Peak Element",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(log n)",spaceComplexity:"O(1)",description:"A peak element is an element that is strictly greater than its neighbors. Given a 0-indexed integer array nums, find a peak element and return its index. If the array contains multiple peaks, return the index to any of the peaks. You may imagine that nums[-1] = nums[n] = -\u221E. You must write an algorithm that runs in O(log n) time.",examples:[{input:"nums = [1,2,3,1]",output:"2",explanation:"3 is a peak element and the function should return index 2."},{input:"nums = [1,2,1,3,5,6,4]",output:"5",explanation:"Either index 1 (value 2) or index 5 (value 6) is a valid answer."}],constraints:["1 \u2264 nums.length \u2264 1000","-2\xB3\xB9 \u2264 nums[i] \u2264 2\xB3\xB9 \u2212 1","nums[i] != nums[i + 1] for all valid i."],hint:"A peak always exists because the array is treated as -\u221E at both ends. If nums[mid] < nums[mid+1], the ascending slope guarantees a peak lies strictly to the right (l = mid+1). Otherwise nums[mid] \u2265 nums[mid+1] so mid is a valid peak candidate (r = mid). Use l < r to converge \u2014 when l === r you have found the peak.",solutions:[Qs]};var Js=`class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        # we can actually just do this one dimension at a time
        # if we go down the matrix
        # we can easily tell which row should be at
        # then we do the same thing in the row
        # so binary search the column, then binary search the row
        # matrix[i][0] gets us the first element of each row
        # we want to find i where matrix[i][0] < target and matrix[i+1][0] > target
        # after which, we just want to do a normal binary search on the row

        rowCount = len(matrix)
        l, r = 0, rowCount - 1

        # we are doing a range, so not exactly sure what we are looking for
        # thus we will use l < r
        while l < r:
            # since we are looking for the maximum row, we want to bias towards right
            mid = (l + r + 1) // 2
            if matrix[mid][0] > target:
                r = mid - 1
            else:
                l = mid

        # now we have l at the row we need

        resultRow = l

        columnCount = len(matrix[0])

        l, r = 0, columnCount - 1

        while l <= r:
            mid = (l + r) // 2
            if matrix[resultRow][mid] == target:
                return True
            if matrix[resultRow][mid] > target:
                r = mid - 1
            else:
                l = mid + 1
        return False`;function Zs(){let i=[[1,3,5,7],[10,11,16,20],[23,30,34,60]],u=3,r=i.length,s=i[0].length,n=i.flat(),t=[],a=(m,f,g,v)=>n.map((w,b)=>({value:w,state:v!==null?b===v?"found":"eliminated":b===g?"active":b>=m&&b<=f?"window":"eliminated"})),e=m=>{let f=Math.floor(m/s),g=m%s;return`[${f}][${g}]`};t.push({explanation:"Search a 2D matrix [[1,3,5,7],[10,11,16,20],[23,30,34,60]] for target=3. The matrix is fully sorted (each row sorted, first element of each row > last of previous), so we can treat it as one flat sorted array of length m*n and run a single binary search.",highlightLine:10,state:{type:"array",cells:n.map(m=>({value:m,state:"default"})),pointers:[]},variables:[{name:"target",value:u},{name:"rows \xD7 cols",value:`${r} \xD7 ${s} = ${r*s}`}]}),t.push({explanation:"Phase 1 \u2014 find the correct row. Binary search on row indices (0..2). We want the largest row whose first element \u2264 target. Use the right-biased mid = (l+r+1)//2 to avoid infinite loop when l+1 == r.",highlightLine:12,state:{type:"array",cells:n.map(m=>({value:m,state:"default"})),pointers:[]},variables:[{name:"rowCount",value:r}]});let o=0,l=r-1;for(t.push({explanation:`Row search: l=${o}, r=${l}.`,highlightLine:12,state:{type:"array",cells:n.map(m=>({value:m,state:"default"})),pointers:[]},variables:[{name:"l (row)",value:o},{name:"r (row)",value:l}]});o<l;){let m=Math.floor((o+l+1)/2),f=i[m][0],g=f>u;t.push({explanation:`Row search: l=${o}, r=${l}, mid=${m}. matrix[${m}][0]=${f} ${g?">":"\u2264"} target=${u}. ${g?`First element of row ${m} exceeds target \u2192 search upper rows \u2192 r = ${m-1}.`:`Row ${m} could contain target \u2192 keep mid as candidate \u2192 l = ${m}.`}`,highlightLine:g?17:19,state:{type:"array",cells:n.map(v=>({value:v,state:"default"})),pointers:[]},variables:[{name:"midRow",value:m},{name:"matrix[mid][0]",value:f},{name:g?"r \u2192":"l \u2192",value:g?m-1:m,highlight:!0}]}),g?l=m-1:o=m}let h=o;t.push({explanation:`Row search converged: resultRow=${h}. Row ${h} is [${i[h].join(",")}]. Now binary search within this row.`,highlightLine:20,state:{type:"array",cells:n.map((m,f)=>({value:m,state:Math.floor(f/s)===h?"window":"eliminated"})),pointers:[]},variables:[{name:"resultRow",value:h,highlight:!0},{name:"row values",value:`[${i[h].join(",")}]`}]});let d=0,c=s-1,p=null;for(t.push({explanation:`Phase 2 \u2014 binary search within row ${h}. l=${d}, r=${c}.`,highlightLine:23,state:{type:"array",cells:n.map((m,f)=>({value:m,state:Math.floor(f/s)===h&&f%s>=d&&f%s<=c?"window":"eliminated"})),pointers:[{index:h*s+d,label:"l"},{index:h*s+c,label:"r"}]},variables:[{name:"l (col)",value:d},{name:"r (col)",value:c}]});d<=c;){let m=Math.floor((d+c)/2),f=h*s+m,g=i[h][m];if(g===u){p=f,t.push({explanation:`l=${d}, r=${c}, mid=${m}: matrix[${h}][${m}]=${g} === target=${u}! Found at flat index ${f} (${e(f)}).`,highlightLine:35,state:{type:"array",cells:a(h*s+d,h*s+c,f,p),pointers:[{index:f,label:"found"}]},variables:[{name:"mid (col)",value:m},{name:"matrix[row][mid]",value:g,highlight:!0},{name:"return",value:"true",highlight:!0}]});break}let v=g<u;t.push({explanation:`l=${d}, r=${c}, mid=${m}: matrix[${h}][${m}]=${g} ${v?"<":">"} target=${u}. ${v?`Target is right \u2192 l = ${m+1}.`:`Target is left \u2192 r = ${m-1}.`}`,highlightLine:v?30:28,state:{type:"array",cells:a(h*s+d,h*s+c,f,null),pointers:[{index:h*s+d,label:"l"},{index:f,label:"mid"},{index:h*s+c,label:"r"}]},variables:[{name:"mid (col)",value:m},{name:"matrix[row][mid]",value:g},{name:v?"l \u2192":"r \u2192",value:v?m+1:m-1,highlight:!0}]}),v?d=m+1:c=m-1}return p===null&&t.push({explanation:`l > r: search exhausted. target=${u} not found \u2192 return false.`,highlightLine:31,state:{type:"array",cells:n.map(m=>({value:m,state:"eliminated"})),pointers:[]},variables:[{name:"return",value:"false",highlight:!0}]}),t}var er={label:"Two-Phase Binary Search",pythonCode:Js,generateSteps:Zs},vt={id:"search-a-2d-matrix",lcNumber:74,title:"Search a 2D Matrix",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search","Matrix"],timeComplexity:"O(log(m\xB7n))",spaceComplexity:"O(1)",description:"You are given an m \xD7 n integer matrix where each row is sorted in non-decreasing order and the first integer of each row is greater than the last integer of the previous row. Given an integer target, return true if target is in the matrix or false otherwise. You must write a solution in O(log(m * n)) time complexity.",examples:[{input:"matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",output:"true"},{input:"matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13",output:"false"}],constraints:["m == matrix.length","n == matrix[i].length","1 \u2264 m, n \u2264 100","-10\u2074 \u2264 matrix[i][j], target \u2264 10\u2074"],hint:"Because rows are sorted and each row's first element exceeds the previous row's last, the entire matrix is one flat sorted sequence. Phase 1: binary search on row indices (right-biased mid) to find the last row whose first element \u2264 target. Phase 2: binary search within that row for the exact target. Total: O(log m + log n) = O(log(m\xB7n)).",solutions:[er]};var tr=`class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        # longest substring is a two pointer / sliding window problem
        # length of substring is based on length of highest frequency value in the substring
        # frequency, so we can do either an array of size 26 since we know it's only uppercase letters
        # or we can do a map to account for all characters and ignore that constraint
        # So one thing to note is that a max length of current substring possible
        # is map.get(maxfreqChar) + k so if (r - l) > map.get(maxfreqChar) + k, we need to shift l
        # so how do we know maxfreqChar in our current substring in constant time
        # in sliding window, we have l and r
        # i want to use r to loop through the string and add freq
        # i want l to keep track of lower bound of the window

        longestSubstringLength = 0
        l = r = 0
        freqMap = {}

        def maxFreqCharInMap() -> int:
            maxChar = maxFreq = 0
            for char, freq in freqMap.items():
                if freq > maxFreq:
                    maxChar = char
                maxFreq = max(maxFreq,freq)
            return maxChar

        while r < len(s):
            freqMap[s[r]] = freqMap.get(s[r],0) + 1
            maxFreqChar = maxFreqCharInMap()
            # If we are out of bounds, remove frequency from s[l] until we are in bound
            # We do have to keep in mind maxFreqChar in map will change as we decrement s[l]
            while (r - l + 1) > freqMap.get(maxFreqChar,0) + k:
                freqMap[s[l]] = freqMap.get(s[l],0) - 1
                l+=1
                maxFreqChar = maxFreqCharInMap()
            # now we know r - l is valid
            longestSubstringLength = max(longestSubstringLength, r - l + 1)
            r+=1
        return longestSubstringLength`;function ar(){let i="AABABBA",r=[],s=0,n=0,t={},a=h=>Object.values(h).reduce((d,c)=>Math.max(d,c),0),e=(h,d,c,p,m)=>i.split("").map((f,g)=>({value:f,state:c?g>=p&&g<=m?"found":"eliminated":g===d?"active":g>=h&&g<d?"window":g<h?"eliminated":"default"}));r.push({explanation:'Longest Repeating Character Replacement on "AABABBA", k=1. Sliding window: the window [l..r] is valid if (window_size \u2212 max_freq_char_count) \u2264 k, meaning we need at most k replacements to make the entire window uniform. Expand r; shrink l when invalid.',highlightLine:11,state:{type:"array",cells:i.split("").map(h=>({value:h,state:"default"})),pointers:[]},variables:[{name:"s",value:i},{name:"k",value:1}]}),r.push({explanation:"Initialize l=0, r=0, freqMap={}, maxLen=0.",highlightLine:12,state:{type:"array",cells:i.split("").map(h=>({value:h,state:"default"})),pointers:[{index:0,label:"l=r"}],hashmap:{},counters:[{label:"maxLen",value:0},{label:"maxFreq",value:0}]},variables:[{name:"l",value:0},{name:"r",value:0},{name:"maxLen",value:0}]});let o=0,l=0;for(let h=0;h<i.length;h++){let d=i[h];t[d]=(t[d]??0)+1;let c=a(t),p=h-s+1;for(r.push({explanation:`r=${h} ('${d}'): add to freqMap. freqMap=${JSON.stringify(t)}. Window size=${p}, maxFreq=${c}. replacements needed = ${p} \u2212 ${c} = ${p-c}. k=1. Window ${p-c<=1?"VALID":"INVALID"}.`,highlightLine:24,state:{type:"array",cells:e(s,h,!1,o,l),pointers:[{index:s,label:"l"},{index:h,label:"r"}],hashmap:y({},t),counters:[{label:"maxLen",value:n},{label:"maxFreq",value:c}]},variables:[{name:"r",value:h},{name:`freqMap['${d}']`,value:t[d],highlight:!0},{name:"windowSize",value:p},{name:"replacements",value:p-c}]});p>c+1;){let f=i[s];t[f]=(t[f]??1)-1,t[f]===0&&delete t[f],s++,c=a(t);let g=h-s+1;if(r.push({explanation:`Window invalid (size ${h-s+2} > maxFreq ${c} + k 1). Shrink: remove s[${s-1}]='${f}', l\u2192${s}. New window size=${g}, maxFreq=${c}. Replacements needed = ${g-c}.`,highlightLine:29,state:{type:"array",cells:e(s,h,!1,o,l),pointers:[{index:s,label:"l"},{index:h,label:"r"}],hashmap:y({},t),counters:[{label:"maxLen",value:n},{label:"maxFreq",value:c}]},variables:[{name:"removed",value:f,highlight:!0},{name:"l",value:s},{name:"windowSize",value:g}]}),g<=c+1)break}let m=h-s+1;c=a(t),m>n&&(n=m,o=s,l=h),r.push({explanation:`Window [${s}..${h}] = "${i.slice(s,h+1)}" is valid (size=${m}, replacements=${m-c} \u2264 k=1). maxLen = max(${n-(m>n-m+m,0)}) = ${n}.`,highlightLine:33,state:{type:"array",cells:e(s,h,!1,o,l),pointers:[{index:s,label:"l"},{index:h,label:"r"}],hashmap:y({},t),counters:[{label:"maxLen",value:n},{label:"maxFreq",value:c}]},variables:[{name:"windowSize",value:m},{name:"maxLen",value:n,highlight:!0}]})}return r.push({explanation:`Done. Longest valid window is "${i.slice(o,l+1)}" (indices ${o}\u2013${l}, length ${n}). With k=1 replacement we can make it all one character. Return ${n}.`,highlightLine:34,state:{type:"array",cells:e(s,i.length-1,!0,o,l),pointers:[],hashmap:y({},t),counters:[{label:"maxLen",value:n}]},variables:[{name:"return",value:n,highlight:!0}]}),r}var nr={label:"Sliding Window + Freq Map",pythonCode:tr,generateSteps:ar},yt={id:"longest-repeating-char-replacement",lcNumber:424,title:"Longest Repeating Character Replacement",difficulty:"Medium",category:"sliding-window",tags:["Hash Map","Sliding Window"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times. Return the length of the longest substring containing the same letter you can get after performing the above operations.",examples:[{input:'s = "ABAB", k = 2',output:"4",explanation:`Replace the two A's with B's (or vice versa) to get "BBBB" or "AAAA".`},{input:'s = "AABABBA", k = 1',output:"4",explanation:'Replace the A in the middle to get "AABBBBA". The substring "BBBB" has length 4.'}],constraints:["1 \u2264 s.length \u2264 10\u2075","s consists of only uppercase English letters.","0 \u2264 k \u2264 s.length"],hint:"Maintain a sliding window [l..r] and a frequency map. The window is valid when (window_size \u2212 max_freq) \u2264 k \u2014 meaning we only need to replace the non-dominant characters. Expand r every iteration; shrink l while the window becomes invalid. Track the longest valid window seen.",solutions:[nr]};var ir=`class Solution:
    def fourSum(self, nums: List[int], target: int) -> List[List[int]]:
        resultSet = set()
        nums.sort()
        for a in range(len(nums)):
            # skip a index to avoid duplicates
            currentTarget = target - nums[a]
            for b in range(a+1,len(nums),1):
                twoSumTarget = currentTarget - nums[b]
                c, d = b+1, len(nums) - 1
                while c < d:
                    if nums[c] + nums[d] == twoSumTarget:
                        result = (nums[a], nums[b], nums[c], nums[d])
                        resultSet.add(result)
                        c+=1
                        d-=1
                    elif nums[c] + nums[d] < twoSumTarget:
                        c+=1
                    else:
                        d-=1
        return list(resultSet)`;function sr(){let i=[1,0,-1,0,-2,2],u=0,r=[...i].sort((e,o)=>e-o),s=r.length,n=[],t=[],a=(e,o,l,h)=>r.map((d,c)=>({value:d,state:c===e||c===o?"active":c>=l&&c<=h&&l<=h?"window":c<e?"visited":"default"}));n.push({explanation:`Sort first: [${i.join(", ")}] \u2192 [${r.join(", ")}]. Sorting enables two-pointer searches. Fix outer indices a and b, then use two-pointer c/d on the remaining subarray to find pairs that sum to target - nums[a] - nums[b].`,highlightLine:4,state:{type:"array",cells:r.map(e=>({value:e,state:"default"})),pointers:[],counters:[{label:"target",value:u}]},variables:[{name:"sorted",value:`[${r.join(", ")}]`},{name:"target",value:u}]});for(let e=0;e<s-3;e++){let o=u-r[e];n.push({explanation:`a=${e}: nums[a]=${r[e]}. currentTarget = target - nums[a] = ${u} - ${r[e]} = ${o}. Fix this element and search for three more that sum to ${o}.`,highlightLine:6,state:{type:"array",cells:r.map((l,h)=>({value:l,state:h===e?"active":h<e?"visited":"default"})),pointers:[{index:e,label:"a"}],counters:[{label:"target",value:u},{label:"currentTarget",value:o},{label:"found",value:t.length}]},variables:[{name:"a",value:e},{name:"nums[a]",value:r[e]},{name:"currentTarget",value:o}]});for(let l=e+1;l<s-2;l++){let h=o-r[l],d=l+1,c=s-1;for(n.push({explanation:`  b=${l}: nums[b]=${r[l]}. twoSumTarget = ${o} - ${r[l]} = ${h}. Set c=${d}, d=${c}. Looking for nums[c]+nums[d]=${h}.`,highlightLine:9,state:{type:"array",cells:a(e,l,d,c),pointers:[{index:e,label:"a"},{index:l,label:"b"},{index:d,label:"c"},{index:c,label:"d"}],counters:[{label:"twoSumTarget",value:h},{label:"found",value:t.length}]},variables:[{name:"b",value:l},{name:"nums[b]",value:r[l]},{name:"twoSumTarget",value:h},{name:"c",value:d},{name:"d",value:c}]});d<c;){let p=r[d]+r[c];if(p===h){let m=`[${r[e]},${r[l]},${r[d]},${r[c]}]`;t.push(m),n.push({explanation:`nums[c]+nums[d] = ${r[d]}+${r[c]} = ${p} == ${h} \u2713 Found quadruplet ${m}! Add to result set, then advance both c and d.`,highlightLine:12,state:{type:"array",cells:r.map((f,g)=>({value:f,state:g===e||g===l||g===d||g===c?"found":g<e?"visited":"default"})),pointers:[{index:e,label:"a"},{index:l,label:"b"},{index:d,label:"c"},{index:c,label:"d"}],counters:[{label:"pairSum",value:p},{label:"found",value:t.length}]},variables:[{name:"sum",value:p,highlight:!0},{name:"quad",value:m,highlight:!0}]}),d++,c--}else p<h?(n.push({explanation:`nums[c]+nums[d] = ${r[d]}+${r[c]} = ${p} < ${h}. Too small \u2014 move c right to increase sum.`,highlightLine:18,state:{type:"array",cells:a(e,l,d,c),pointers:[{index:e,label:"a"},{index:l,label:"b"},{index:d,label:"c"},{index:c,label:"d"}],counters:[{label:"pairSum",value:p},{label:"found",value:t.length}]},variables:[{name:"sum",value:p,highlight:!0},{name:"action",value:"c++"}]}),d++):(n.push({explanation:`nums[c]+nums[d] = ${r[d]}+${r[c]} = ${p} > ${h}. Too large \u2014 move d left to decrease sum.`,highlightLine:20,state:{type:"array",cells:a(e,l,d,c),pointers:[{index:e,label:"a"},{index:l,label:"b"},{index:d,label:"c"},{index:c,label:"d"}],counters:[{label:"pairSum",value:p},{label:"found",value:t.length}]},variables:[{name:"sum",value:p,highlight:!0},{name:"action",value:"d--"}]}),c--)}}}return n.push({explanation:`All (a, b) pairs processed. Result set: ${t.join(", ")}. O(n\xB3) time (two outer loops + two-pointer inner scan), O(n) space for output.`,highlightLine:21,state:{type:"array",cells:r.map(e=>({value:e,state:"visited"})),pointers:[],counters:[{label:"result",value:t.join(", ")}]},variables:[{name:"return",value:t.join(", "),highlight:!0}]}),n}var rr={label:"Sort + Two Nested Loops + Two Pointers",pythonCode:ir,generateSteps:sr},bt={id:"four-sum",lcNumber:18,title:"4Sum",difficulty:"Medium",category:"two-pointers",tags:["Array","Two Pointers","Sorting"],timeComplexity:"O(n\xB3)",spaceComplexity:"O(n)",description:"Given an array nums of n integers and an integer target, return an array of all unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that the four indices are distinct and their values sum to target.",examples:[{input:"nums = [1,0,-1,0,-2,2], target = 0",output:"[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]"},{input:"nums = [2,2,2,2,2], target = 8",output:"[[2,2,2,2]]"}],constraints:["1 \u2264 nums.length \u2264 200","-10\u2079 \u2264 nums[i] \u2264 10\u2079","-10\u2079 \u2264 target \u2264 10\u2079"],hint:"Sort the array. Fix two outer indices a and b (O(n\xB2)), then run a two-pointer search with c and d on the remaining subarray to find pairs that complete the quadruplet. Use a result set to automatically deduplicate.",solutions:[rr]};var lr=`class Solution:

    def minWindow(self, s: str, t: str) -> str:
        # I initially assumed minimum window must start/end with a char from t
        # but it fails with scenarios like s = "aaab" and t = "ab"
        # where the shortest is size 2 but our initial solution would give size 4
        # we will still use maps of freq
        # but we will keep track of what we have (sMap) vs what we need (tMap)
        # we will update result iff sMap has same count for each char as tMap
        return "TBD"


    def minWindowIncorrect(self, s: str, t: str) -> str:
        # this is similar to character replacement and permutation
        # so we do sliding window and we have formula of (r - l + 1) = permutation + k
        # big thing here is that k is a variable and we want to minimize it essentially
        # also a big thing to note here is that a potential result substring must start and finish with a char in t
        # we do care for freq like we did in both character replacement and permutation
        # so we should use a map
        # if potential solutions must start and end with a char in t, we should just have a map for t's frequency only
        # and then another for s's frequency

        result = ""
        if len(t) > len(s):
            return result

        sMap = {}
        tMap = {}

        for i in range(len(t)):
            tMap[t[i]] = 1 + tMap.get(t[i],0)

        def isResultComplete()->bool:
            # check if all of tMap is in result
            # result's frequency is in sMap
            for key in tMap.keys():
                # sMap can have more but not less than tMap
                if sMap[key] - tMap[key] < 0:
                    return False
            return True

        l = r = 0

        while r < len(s):
            sMap[s[r]] = 1 + sMap.get(s[i],0)
            result.append(s[r])
            # so we want to make sure result starts with a char from t
            while s[l] not in tMap:
                # remove first element from result
                result=result[1:]
                l+=1
            # now that we know we are on a possible result
            # we need to make sure all characters of t are covered in the result
            if s[r] in tMap:
                # i have these on different ifs to reduce some runtime
                if isResultComplete:
                    return result
            # if not a potential result, we just keep adding to result and increment r
            r+=1

        # if we exited loop, we did not find a result
        return ""`;function or(){let i="ADOBECODEBANC",r=[],s={};for(let p of"ABC")s[p]=(s[p]??0)+1;let n=Object.keys(s).length,t=(p,m,f,g)=>i.split("").map((v,w)=>({value:v,state:f>=0&&w>=f&&w<=g&&f<=g?"found":w>=p&&w<=m?"window":w<p?"visited":"default"}));r.push({explanation:`Find the minimum window in s="${i}" that contains all characters of t="ABC". Strategy: expand right pointer r until all chars of t are covered (have \u2265 need), then shrink left pointer l to minimize the window. Track best window seen so far.`,highlightLine:1,state:{type:"array",cells:i.split("").map(p=>({value:p,state:"default"})),pointers:[],hashmap:x(y({},s),{"--- need":Object.keys(s).length})},variables:[{name:"s",value:i},{name:"t",value:"ABC"},{name:"tMap",value:JSON.stringify(s)}]});let a={},e=0,o=-1,l=-1,h=1/0,d=0;for(let p=0;p<i.length;p++){let m=i[p];a[m]=(a[m]??0)+1,s[m]!==void 0&&a[m]===s[m]&&e++;let f=i.slice(d,p+1),g=Object.entries(s).map(([v,w])=>`${v}:${a[v]??0}/${w}`).join(", ");for(r.push({explanation:`Expand r=${p}: add '${m}'. Window "${f}" (l=${d}..r=${p}). Coverage: {${g}}. have=${e}/${n} distinct chars fully covered.`,highlightLine:40,state:{type:"array",cells:i.split("").map((v,w)=>({value:v,state:w===p?"active":w>=d&&w<p?"window":w<d?"visited":"default"})),pointers:[{index:d,label:"l"},{index:p,label:"r"}],hashmap:Object.fromEntries(Object.entries(s).map(([v,w])=>[`${v} (need ${w})`,a[v]??0])),counters:[{label:"have",value:e},{label:"need",value:n},{label:"minLen",value:h===1/0?"\u221E":h}]},variables:[{name:"r",value:p},{name:"char",value:m},{name:"have",value:e},{name:"need",value:n}]});e===n;){let v=p-d+1;v<h&&(h=v,o=d,l=p);let w=o>=0?i.slice(o,l+1):"none";r.push({explanation:`have=${e} == need=${n}: window valid! Window "${i.slice(d,p+1)}" (len=${v}). ${v<h+1?`New best: "${w}" (len=${h}).`:`Not better than current best "${w}".`} Shrink l to find smaller window.`,highlightLine:47,state:{type:"array",cells:t(d,p,o,l),pointers:[{index:d,label:"l"},{index:p,label:"r"}],hashmap:Object.fromEntries(Object.entries(s).map(([$,Y])=>[`${$} (need ${Y})`,a[$]??0])),counters:[{label:"have",value:e},{label:"need",value:n},{label:"minLen",value:h},{label:"best",value:w}]},variables:[{name:"window len",value:v},{name:"best",value:w,highlight:!0}]});let b=i[d];a[b]--,s[b]!==void 0&&a[b]<s[b]&&e--,d++}}let c=o>=0?i.slice(o,l+1):"";return r.push({explanation:`Finished scanning s. Minimum window is "${c}" (indices ${o}..${l}, length ${h}). O(n) time \u2014 each character is added and removed at most once. O(k) space for the frequency maps where k = |charset|.`,highlightLine:55,state:{type:"array",cells:i.split("").map((p,m)=>({value:p,state:m>=o&&m<=l&&o>=0?"found":"visited"})),pointers:o>=0?[{index:o,label:"result start"},{index:l,label:"result end"}]:[],counters:[{label:"result",value:c||'""'}]},variables:[{name:"return",value:c||'""',highlight:!0}]}),r}var ur={label:"Variable Sliding Window + Frequency Maps",pythonCode:lr,generateSteps:or},wt={id:"minimum-window-substring",lcNumber:76,title:"Minimum Window Substring",difficulty:"Hard",category:"sliding-window",tags:["Hash Map","Sliding Window","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(k)",description:"Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included. If no such window exists, return the empty string.",examples:[{input:'s = "ADOBECODEBANC", t = "ABC"',output:'"BANC"',explanation:'The minimum window "BANC" contains A, B, and C from t.'},{input:'s = "a", t = "a"',output:'"a"'},{input:'s = "a", t = "aa"',output:'""',explanation:"s only has one 'a' but t needs two."}],constraints:["m == s.length, n == t.length","1 \u2264 m, n \u2264 10\u2075","s and t consist of uppercase and lowercase English letters."],hint:"Use two frequency maps: tMap (what you need) and sMap (what you have in the current window). Track how many distinct characters are fully satisfied (have vs need). Expand r to cover t, then shrink l to minimize \u2014 update best window whenever have == need.",solutions:[ur]};var hr=`import math

class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        # we are looking for the value k
        # using a bit of math, we can tell we are looking for where math.ceil(piles[i] / k) = h
        # we also know the max this k should be is the max(piles)
        # knowing the list is not sorted, we should just go through the list to find the max giving us O(n) minimum
        # brute force solution is trying k from 1 to max(piles), giving us a time complexity of O(n*max(piles))
        # what we can do is actually just do the same thing but with binary search
        # l = 1, r = max(piles)

        l, r = 1, max(piles)

        # we are not sure what we are looking for just yet
        # thus we want to use l < r
        while l < r:
            mid = (l + r) // 2
            currentHours = 0
            for pile in piles:
                currentHours += math.ceil(pile / mid)

            # can't finish the bananas in mid eating speed
            # exclude mid from further searches
            if currentHours > h:
                l = mid + 1
            else:
            # can finish in mid eating speed, keep it as a candidate
                r = mid
        return l`;function dr(){let i=[3,6,7,11],u=8,r=[],s=Math.max(...i);r.push({explanation:`Find the minimum eating speed k so Koko can finish all piles in h=${u} hours. piles=[${i.join(", ")}]. Binary search on the answer space [1..${s}] (1 is slowest, max(piles) is always fast enough). For each candidate k, compute hours=\u03A3\u2308pile/k\u2309; if hours \u2264 h, k is feasible (keep as candidate, try smaller); else k is too slow (must go larger).`,highlightLine:11,state:{type:"array",cells:i.map(e=>({value:e,state:"default"})),pointers:[],counters:[{label:"h (max hours)",value:u},{label:"search range",value:`[1..${s}]`}]},variables:[{name:"piles",value:`[${i.join(", ")}]`},{name:"h",value:u},{name:"max(piles)",value:s}]});let n=1,t=s;for(r.push({explanation:`Initialize l=1, r=${s}=max(piles). We use l < r (not l \u2264 r) because we want to converge to the minimum feasible k without overshooting \u2014 when l === r, that value is the answer.`,highlightLine:13,state:{type:"array",cells:i.map(e=>({value:e,state:"default"})),pointers:[],counters:[{label:"l",value:n},{label:"r",value:t},{label:"h",value:u}]},variables:[{name:"l",value:n},{name:"r",value:t}]});n<t;){let e=Math.floor((n+t)/2),o=0;for(let h of i)o+=Math.ceil(h/e);r.push({explanation:`l=${n}, r=${t}, mid=${e} (k=${e}). Computing hours needed at speed k=${e}: \u03A3\u2308pile/${e}\u2309 = ${i.map(h=>`\u2308${h}/${e}\u2309=${Math.ceil(h/e)}`).join(" + ")} = ${o}.`,highlightLine:17,state:{type:"array",cells:i.map(h=>({value:h,state:"active"})),pointers:[],counters:[{label:"k (mid)",value:e},{label:"hoursNeeded",value:o},{label:"h",value:u},{label:"l",value:n},{label:"r",value:t}]},variables:[{name:"mid (k)",value:e},{name:"hoursNeeded",value:o},{name:"h",value:u}]});let l=o>u;r.push({explanation:l?`hoursNeeded=${o} > h=${u}: speed k=${e} is too slow \u2014 Koko can't finish in time. Exclude mid, set l = mid+1 = ${e+1}.`:`hoursNeeded=${o} \u2264 h=${u}: speed k=${e} is feasible \u2014 Koko finishes in time. Keep mid as a candidate (might do better), set r = mid = ${e}.`,highlightLine:l?23:26,state:{type:"array",cells:i.map(h=>({value:h,state:l?"eliminated":"window"})),pointers:[],counters:[{label:"k (mid)",value:e},{label:"hoursNeeded",value:o},{label:"h",value:u},{label:l?"l \u2192":"r \u2192",value:l?e+1:e}]},variables:[{name:"feasible?",value:l?"NO":"YES",highlight:!0},{name:l?"l \u2192":"r \u2192",value:l?e+1:e,highlight:!0}]}),l?n=e+1:t=e}let a=i.reduce((e,o)=>e+Math.ceil(o/n),0);return r.push({explanation:`l === r === ${n}. Converged! Minimum eating speed k=${n}. Verification: \u03A3\u2308pile/${n}\u2309 = ${i.map(e=>`\u2308${e}/${n}\u2309=${Math.ceil(e/n)}`).join(" + ")} = ${a} \u2264 ${u} \u2713. O(n log m) time where n=piles.length and m=max(piles). O(1) space.`,highlightLine:27,state:{type:"array",cells:i.map(e=>({value:e,state:"found"})),pointers:[],counters:[{label:"answer k",value:n},{label:"hoursNeeded",value:a},{label:"h",value:u}]},variables:[{name:"return k",value:n,highlight:!0}]}),r}var cr={label:"Binary Search on Answer Space",pythonCode:hr,generateSteps:dr},xt={id:"koko-eating-bananas",lcNumber:875,title:"Koko Eating Bananas",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(n log m)",spaceComplexity:"O(1)",description:"Given n piles of bananas and h hours before guards return, find the minimum eating speed k (bananas/hour) such that Koko can eat all bananas in h hours. Each hour she picks one pile and eats up to k bananas from it.",examples:[{input:"piles = [3,6,7,11], h = 8",output:"4"},{input:"piles = [30,11,23,4,20], h = 5",output:"30"},{input:"piles = [30,11,23,4,20], h = 6",output:"23"}],constraints:["1 \u2264 piles.length \u2264 10\u2074","piles.length \u2264 h \u2264 10\u2079","1 \u2264 piles[i] \u2264 10\u2079"],hint:"The answer lies in [1, max(piles)]. Binary search on k: for each candidate mid, compute \u03A3\u2308pile/mid\u2309. If hours > h the speed is too slow (l = mid+1); if hours \u2264 h keep mid as a candidate (r = mid). Use l < r to converge on the minimum feasible k.",solutions:[cr]};var pr=`class Solution:
    def singleNonDuplicate(self, nums: List[int]) -> int:
        # logn time and O(1) space means has to be binary search and no extra space
        # we don't know what we are looking for, thus we need a way to identify which half it is in
        # since all elements appear twice except for the target, we know len(nums) is odd
        # return condition: mid != mid + 1 and mid != mid - 1
        # [1,1,2,3,3,4,4,8,8]
        #  l       m       r
        # since we know the side with the answer is odd, we can look at length of both sides without current element
        # if m=m-1, then len(left)=m-1, if len(left)%2==0, then we move l=m+1 else r=m-1
        # if m!=m-1, then len(left)=m

        l,r = 0,len(nums) - 1

        while l <= r:
            mid = (l+r)//2

            # since we are doing mid - 1 and mid + 1 here
            # we need to make sure they are inbound
            # if mid -1 is out of bounds or if nums[mid - 1] != nums[mid], left side check is good
            # if mid + 1 is out of bounds or if nums[mid + 1] != nums[mid], right side check is good
            if (mid - 1 < 0 or nums[mid - 1] != nums[mid]) and (mid + 1 >= len(nums) or nums[mid] != nums[mid + 1]):
                return nums[mid]
            # no answers found yet
            # check which side is odd
            lenLeft = 0
            if nums[mid] == nums[mid - 1]:
                lenLeft = mid - 1
            else:
                lenLeft = mid
            if lenLeft%2==0:
                l=mid+1
            else:
                r=mid-1

        return -1`;function mr(){let i=[1,1,2,3,3,4,4,8,8],u=i.length,r=[],s=(a,e,o,l)=>i.map((h,d)=>({value:h,state:l!==null&&d===l?"found":l!==null?"eliminated":d===o?"active":d>=a&&d<=e?"window":"eliminated"}));r.push({explanation:`Find the single non-duplicate in [${i.join(", ")}] in O(log n). All elements appear exactly twice except one. Key insight: in the left portion before the single element, pairs start at even indices (nums[0]=nums[1], nums[2]=nums[3]\u2026). After the single element, pairs start at odd indices. Binary search on this parity property.`,highlightLine:13,state:{type:"array",cells:i.map(a=>({value:a,state:"default"})),pointers:[]},variables:[{name:"nums",value:`[${i.join(", ")}]`}]});let n=0,t=u-1;for(r.push({explanation:`Initialize l=${n}, r=${t}. Use l \u2264 r because we return as soon as we find the single element (not just converging on a boundary).`,highlightLine:13,state:{type:"array",cells:s(n,t,null,null),pointers:[{index:n,label:"l"},{index:t,label:"r"}]},variables:[{name:"l",value:n},{name:"r",value:t}]});n<=t;){let a=Math.floor((n+t)/2),e=a-1<0||i[a-1]!==i[a],o=a+1>=u||i[a]!==i[a+1];if(r.push({explanation:`l=${n}, r=${t}, mid=${a}: nums[mid]=${i[a]}. Check bounds: left neighbor ${a-1<0?"OOB":`nums[${a-1}]=${i[a-1]}`} (ok=${e}), right neighbor ${a+1>=u?"OOB":`nums[${a+1}]=${i[a+1]}`} (ok=${o}).`,highlightLine:19,state:{type:"array",cells:s(n,t,a,null),pointers:[{index:n,label:"l"},{index:a,label:"mid"},{index:t,label:"r"}]},variables:[{name:"mid",value:a},{name:"nums[mid]",value:i[a]},{name:"leftOk",value:String(e)},{name:"rightOk",value:String(o)}]}),e&&o){r.push({explanation:`Both neighbors differ from nums[mid]=${i[a]} (or are out of bounds). Found the single element! Return ${i[a]}.`,highlightLine:20,state:{type:"array",cells:s(n,t,null,a),pointers:[{index:a,label:"answer"}]},variables:[{name:"return",value:i[a],highlight:!0}]});break}let l;i[a]===i[a-1]?l=a-1:l=a;let h=l%2===0;r.push({explanation:`Not the single element. ${i[a]===i[a-1]?`nums[mid]=nums[mid-1]=${i[a]}, so lenLeft (elements strictly left of the pair) = mid-1 = ${l}.`:`nums[mid]\u2260nums[mid-1], so lenLeft = mid = ${l}.`} lenLeft=${l} is ${l%2===0?"even":"odd"} \u2192 single element is ${h?"to the RIGHT":"to the LEFT"} \u2192 ${h?`l = mid+1 = ${a+1}`:`r = mid-1 = ${a-1}`}.`,highlightLine:h?29:31,state:{type:"array",cells:s(n,t,a,null),pointers:[{index:n,label:"l"},{index:a,label:"mid"},{index:t,label:"r"}]},variables:[{name:"lenLeft",value:l},{name:"parity",value:l%2===0?"even \u2192 go right":"odd \u2192 go left"},{name:h?"l \u2192":"r \u2192",value:h?a+1:a-1,highlight:!0}]}),h?n=a+1:t=a-1}return r}var gr={label:"Binary Search on Pair Parity",pythonCode:pr,generateSteps:mr},$t={id:"single-element-in-sorted-array",lcNumber:540,title:"Single Element in a Sorted Array",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(log n)",spaceComplexity:"O(1)",description:"You are given a sorted array where every element appears exactly twice, except for one element which appears exactly once. Find that single element. Your solution must run in O(log n) time and O(1) space.",examples:[{input:"nums = [1,1,2,3,3,4,4,8,8]",output:"2"},{input:"nums = [3,3,7,7,10,11,11]",output:"10"}],constraints:["1 \u2264 nums.length \u2264 10\u2075","0 \u2264 nums[i] \u2264 10\u2075","nums is sorted."],hint:"Before the single element, each pair starts at an even index. After it, pairs start at odd indices. At mid: if nums[mid] differs from both neighbors, it is the single element. Otherwise, compute lenLeft (count of elements strictly left of mid's pair) \u2014 if even, the single element is to the right; if odd, it's to the left.",solutions:[gr]};var fr=`# Definition for a Node.
class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        # ok so to do a deep copy, we need to do completely new nodes of each
        # and then after we do copy with newNode = Node(old.val, old.neighbors)
        # we need to be able to traverse through old.neighbors and give them to the newNode
        # so we have to a visited set?
        # or we have a map of old -> new node so that we can track neighbors
        # so what is our dfs going to accomplish
        #

        oldToNew = {}

        def dfs(oldNode):
            # if we already visited and created a copy of this node, exit
            if oldNode in oldToNew:
                return oldToNew[oldNode]

            # now that we know we are visiting a new node
            # we need to create a copy
            newNode = Node(oldNode.val)

            # map oldNode to newNode
            oldToNew[oldNode] = newNode

            # create copies of oldNode's neighbors and put them as newNode's neighbors
            for neighbor in oldNode.neighbors:
                newNode.neighbors.append(dfs(neighbor))

            return newNode

        return dfs(node)`,de=[1,2,3,4],vr={1:[2,4],2:[1,3],3:[2,4],4:[1,3]};function yr(){let i=[],u={},r=(t,a)=>de.map(e=>({value:e,state:e===t?"active":a.has(e)?"visited":"default"}));i.push({explanation:"Clone a connected undirected graph with 4 nodes. Adjacency: 1\u2194{2,4}, 2\u2194{1,3}, 3\u2194{2,4}, 4\u2194{1,3}. Strategy: DFS from node 1, maintaining a map oldToNew. When we visit a node for the first time, create its clone and record it. When we re-encounter a node, return the cached clone to avoid infinite loops.",highlightLine:17,state:{type:"array",cells:de.map(t=>({value:t,state:"default"})),pointers:[],hashmap:{},counters:[{label:"nodes cloned",value:0}]},variables:[{name:"graph",value:"adjList = [[2,4],[1,3],[2,4],[1,3]]"},{name:"start",value:"node 1"}]});let s=new Set,n=[1,2,3,4];for(let t of n){i.push({explanation:`dfs(node ${t}): node ${t} not in oldToNew. Create clone of node ${t}. Map node${t} \u2192 clone${t} in oldToNew.`,highlightLine:26,state:{type:"array",cells:r(t,new Set(s)),pointers:[{index:t-1,label:"visiting"}],hashmap:y({},u),counters:[{label:"nodes cloned",value:s.size}]},variables:[{name:"oldNode",value:`node ${t}`},{name:"newNode",value:`clone ${t}`}]}),u[`node ${t}`]=`clone ${t}`,s.add(t);let a=vr[t];i.push({explanation:`node ${t} cloned and mapped. Now iterate over neighbors of node ${t}: [${a.join(", ")}]. For each neighbor, call dfs(neighbor) and append result to clone${t}.neighbors.`,highlightLine:32,state:{type:"array",cells:r(t,new Set(s)),pointers:[{index:t-1,label:`clone ${t}`}],hashmap:y({},u),counters:[{label:"nodes cloned",value:s.size}]},variables:[{name:"node",value:t},{name:"neighbors",value:`[${a.join(", ")}]`}]});let e=a.filter(o=>s.has(o));e.length>0&&i.push({explanation:`Processing neighbors of node ${t}: ${e.map(o=>`node ${o} already in oldToNew \u2192 return clone ${o} (cached)`).join("; ")}. No re-clone needed \u2014 the map prevents infinite recursion on graph cycles.`,highlightLine:22,state:{type:"array",cells:de.map(o=>({value:o,state:e.includes(o)?"found":o===t?"active":s.has(o)?"visited":"default"})),pointers:[{index:t-1,label:`node ${t}`}],hashmap:y({},u),counters:[{label:"nodes cloned",value:s.size}]},variables:[{name:"cached lookups",value:e.map(o=>`node ${o}`).join(", ")}]})}return i.push({explanation:`DFS complete. All 4 nodes cloned and all neighbor references wired. oldToNew = {${Object.entries(u).map(([t,a])=>`${t}\u2192${a}`).join(", ")}}. Return clone 1 as the entry point of the cloned graph. O(V+E) time (visit each node and edge once), O(V) space for oldToNew.`,highlightLine:37,state:{type:"array",cells:de.map(t=>({value:t,state:"found"})),pointers:[{index:0,label:"return"}],hashmap:y({},u),counters:[{label:"nodes cloned",value:4}]},variables:[{name:"return",value:"clone 1 (deep copy)",highlight:!0}]}),i}var br={label:"DFS + HashMap (oldToNew)",pythonCode:fr,generateSteps:yr},kt={id:"clone-graph",lcNumber:133,title:"Clone Graph",difficulty:"Medium",category:"graphs",tags:["DFS","BFS","Hash Map"],timeComplexity:"O(V+E)",spaceComplexity:"O(V)",description:"Given a reference to a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains an integer value and a list of its neighbors.",examples:[{input:"adjList = [[2,4],[1,3],[2,4],[1,3]]",output:"[[2,4],[1,3],[2,4],[1,3]]",explanation:"4 nodes: 1\u2194{2,4}, 2\u2194{1,3}, 3\u2194{2,4}, 4\u2194{1,3}."},{input:"adjList = [[]]",output:"[[]]",explanation:"Single node with no neighbors."},{input:"adjList = []",output:"[]",explanation:"Empty graph."}],constraints:["0 \u2264 number of nodes \u2264 100","1 \u2264 Node.val \u2264 100","Node.val is unique for each node.","No repeated edges, no self-loops.","Graph is connected."],hint:"Use DFS with a hashmap oldToNew. When you first visit a node, create its clone and store the mapping. When you encounter a node already in the map, return the cached clone \u2014 this is what breaks infinite loops on cycles. Then recurse into each neighbor and append the returned clone to the new node's neighbor list.",solutions:[br]};var wr=`import collections
from typing import List

class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        # one big thing that prevented us from solving this problem initially was not properly tracking
        # what if a course had multiple pre-reqs. So this means we should keep track of how many prereqs each node has
        # given 0 <= ai, bi < numCourses, we will initialize prereqCounter = [0] * numCourses
        # then do same thing as we did in our initial thought process

        prereqCounter = [0] * numCourses
        neighborMap = collections.defaultdict(list)
        canTake = collections.deque()
        numbersOfCoursesTaken = 0

        for row in prerequisites:
            course = row[0]
            prereq = row[1]
            prereqCounter[course]+=1
            neighborMap[prereq].append(course)

        # so now we add all nodes with 0s in prereqCounter to canTake
        for i in range(len(prereqCounter)):
            if prereqCounter[i] == 0:
                canTake.append(i)

        # now we do standard BFS
        while canTake:
            currentCourse = canTake.popleft()
            numbersOfCoursesTaken+=1

            # now let's take a look at all the neighbors of currentCourse
            for dependentCourse in neighborMap[currentCourse]:
                # since we already took currentCourse, we decrement prereqCounter[dependentCourse]
                prereqCounter[dependentCourse]-=1
                # if this is now zero, we can take it, so we add it to the queue
                if prereqCounter[dependentCourse] == 0:
                    canTake.append(dependentCourse)

        return numbersOfCoursesTaken >= numCourses`,I={0:"[1,2]",1:"[3]",2:"[3]",3:"[]"};function H(i,u,r,s){return[0,1,2,3].map(n=>({value:s[n],state:r.has(n)?"found":n===i?"active":u.has(n)?"visited":"default"}))}function xr(){let i=[],r=[0,1,1,2],s=new Set,n=new Set,t=0,a=[];return i.push({explanation:"Course Schedule: can we finish all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]? Strategy: Kahn's BFS topological sort. Build an in-degree array (number of unsatisfied prerequisites per course) and an adjacency map (prereq \u2192 list of dependent courses). Cell values show each course's current in-degree.",highlightLine:11,state:{type:"array",cells:[0,1,2,3].map(e=>({value:r[e],state:"default"})),pointers:[{index:0,label:"course 0"},{index:1,label:"course 1"},{index:2,label:"course 2"},{index:3,label:"course 3"}],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:0}]},variables:[{name:"numCourses",value:4},{name:"prerequisites",value:"[[1,0],[2,0],[3,1],[3,2]]"}]}),i.push({explanation:"Build prereqCounter and neighborMap. For each [course, prereq]: prereqCounter[course]++ and neighborMap[prereq].append(course). Result: prereqCounter = [0,1,1,2], neighborMap = {0:[1,2], 1:[3], 2:[3]}. The hashmap on the right shows the adjacency (neighbor) map.",highlightLine:16,state:{type:"array",cells:[0,1,2,3].map(e=>({value:r[e],state:"default"})),pointers:[],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:0}]},variables:[{name:"prereqCounter",value:"[0,1,1,2]"},{name:"neighborMap",value:"{0:[1,2], 1:[3], 2:[3]}"}]}),a.push(0),i.push({explanation:"Seed BFS queue: scan prereqCounter and enqueue all courses with in-degree 0. Only course 0 qualifies. canTake = [0]. These are the courses with no prerequisites \u2014 our BFS starting points.",highlightLine:23,state:{type:"array",cells:H(0,new Set,new Set,r),pointers:[{index:0,label:"queued"}],hashmap:I,counters:[{label:"queue",value:"[0]"},{label:"coursesTaken",value:0}]},variables:[{name:"canTake",value:"[0]"}]}),a.shift(),t++,s.add(0),i.push({explanation:`BFS iteration 1: dequeue course 0. coursesTaken = ${t}. Examine neighbors of course 0: [1, 2]. For each dependent course, decrement its prereqCounter since course 0 is now satisfied.`,highlightLine:29,state:{type:"array",cells:H(0,s,n,r),pointers:[{index:0,label:"dequeued"}],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:t}]},variables:[{name:"currentCourse",value:0},{name:"neighbors",value:"[1, 2]"}]}),r[1]--,r[2]--,a.push(1,2),i.push({explanation:"Decrement neighbors of course 0. prereqCounter[1]: 1\u21920 (enqueue course 1). prereqCounter[2]: 1\u21920 (enqueue course 2). Queue is now [1, 2]. Cell values updated to reflect new in-degrees.",highlightLine:35,state:{type:"array",cells:H(null,s,n,r),pointers:[{index:1,label:"in-deg\u21920"},{index:2,label:"in-deg\u21920"}],hashmap:I,counters:[{label:"queue",value:"[1, 2]"},{label:"coursesTaken",value:t}]},variables:[{name:"prereqCounter[1]",value:r[1]},{name:"prereqCounter[2]",value:r[2]}]}),a.shift(),t++,s.add(1),i.push({explanation:`BFS iteration 2: dequeue course 1. coursesTaken = ${t}. Examine neighbors of course 1: [3]. Decrement prereqCounter[3]: 2\u21921. Course 3 still needs course 2 \u2014 not enqueued yet.`,highlightLine:29,state:{type:"array",cells:H(1,s,n,r),pointers:[{index:1,label:"dequeued"}],hashmap:I,counters:[{label:"queue",value:"[2]"},{label:"coursesTaken",value:t}]},variables:[{name:"currentCourse",value:1},{name:"neighbors",value:"[3]"}]}),r[3]--,i.push({explanation:"prereqCounter[3]: 2\u21921. Course 3 still has one unsatisfied prerequisite (course 2). It stays out of the queue. Continue dequeuing.",highlightLine:35,state:{type:"array",cells:H(null,s,n,r),pointers:[{index:3,label:"in-deg\u21921"}],hashmap:I,counters:[{label:"queue",value:"[2]"},{label:"coursesTaken",value:t}]},variables:[{name:"prereqCounter[3]",value:r[3]}]}),a.shift(),t++,s.add(2),i.push({explanation:`BFS iteration 3: dequeue course 2. coursesTaken = ${t}. Examine neighbors of course 2: [3]. Decrement prereqCounter[3]: 1\u21920. Course 3 now has all prerequisites met \u2014 enqueue it.`,highlightLine:29,state:{type:"array",cells:H(2,s,n,r),pointers:[{index:2,label:"dequeued"}],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:t}]},variables:[{name:"currentCourse",value:2},{name:"neighbors",value:"[3]"}]}),r[3]--,a.push(3),i.push({explanation:"prereqCounter[3]: 1\u21920 \u2192 enqueue course 3. Queue is now [3]. All of course 3's prerequisites (courses 1 and 2) have been taken.",highlightLine:38,state:{type:"array",cells:H(null,s,n,r),pointers:[{index:3,label:"in-deg\u21920"}],hashmap:I,counters:[{label:"queue",value:"[3]"},{label:"coursesTaken",value:t}]},variables:[{name:"prereqCounter[3]",value:r[3]}]}),a.shift(),t++,n.add(3),i.push({explanation:`BFS iteration 4: dequeue course 3. coursesTaken = ${t}. Course 3 has no neighbors. Queue is now empty. BFS complete \u2014 all 4 courses taken.`,highlightLine:29,state:{type:"array",cells:H(3,s,n,r),pointers:[{index:3,label:"dequeued"}],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:t}]},variables:[{name:"currentCourse",value:3},{name:"neighbors",value:"[]"}]}),i.push({explanation:`Result: coursesTaken (${t}) >= numCourses (4) \u2192 return true. Every course was processed in topological order \u2014 no cycle exists. If a cycle had existed, some nodes would stay stuck with in-degree > 0 forever, and coursesTaken would be < numCourses. O(V+E) time, O(V+E) space.`,highlightLine:40,state:{type:"array",cells:[0,1,2,3].map(e=>({value:r[e],state:"found"})),pointers:[],hashmap:I,counters:[{label:"queue",value:"[]"},{label:"coursesTaken",value:t},{label:"result",value:"true"}]},variables:[{name:"return",value:`${t} >= 4 \u2192 true`,highlight:!0}]}),i}var $r={label:"Kahn's BFS Topological Sort",pythonCode:wr,generateSteps:xr},St={id:"course-schedule",lcNumber:207,title:"Course Schedule",difficulty:"Medium",category:"graphs",tags:["Topological Sort","BFS","Cycle Detection"],timeComplexity:"O(V+E)",spaceComplexity:"O(V+E)",description:"There are numCourses courses labeled 0 to numCourses-1. Given prerequisites[i] = [a, b] meaning you must take b before a, return true if you can finish all courses (i.e., no cycle exists), or false otherwise.",examples:[{input:"numCourses = 2, prerequisites = [[1,0]]",output:"true",explanation:"Take course 0 first, then course 1."},{input:"numCourses = 2, prerequisites = [[1,0],[0,1]]",output:"false",explanation:"Courses 0 and 1 depend on each other \u2014 a cycle makes it impossible."}],constraints:["1 \u2264 numCourses \u2264 2000","0 \u2264 prerequisites.length \u2264 5000","prerequisites[i].length == 2","0 \u2264 ai, bi < numCourses","All prerequisite pairs are unique."],hint:"Use Kahn's BFS: build an in-degree array and adjacency map from prerequisites. Seed the BFS queue with all courses that have in-degree 0. Each time you process a course, decrement the in-degree of its dependents; enqueue any that reach 0. If total courses processed equals numCourses, no cycle \u2014 return true.",solutions:[$r]};var kr=`import collections
from typing import List

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        # so same idea as course schedule 1
        # we need to find starting nodes to go for
        # so we once again need a way to indicate whether a course is takeable
        # so we will use canTake = [0] * numCourses
        # then we will have a map of prereq -> courses
        # traverse through the neighbors and add to a result list as we take each course
        # one thing we do need to consider is cycles
        # so how do we detect cycles in a graph

        canTake = [0] * numCourses

        prereqMap = collections.defaultdict(list)

        courseList = []

        for row in prerequisites:
            course = row[0]
            prereq = row[1]
            # increase requirement for this course
            canTake[course]+=1
            # append to prereq
            prereqMap[prereq].append(course)

        # now we go through the canTake array and put everything takeable now into the queue for BFS

        courseQueue = collections.deque()

        for i in range(len(canTake)):
            if canTake[i] == 0:
                courseQueue.append(i)

        # with this initial list of takeable classes, we start BFS

        while courseQueue:
            currentCourse = courseQueue.popleft()
            # we mark this as taken by adding to the result
            courseList.append(currentCourse)
            # now we check neighbors of this and add to the list if they are takeable
            for neighbor in prereqMap[currentCourse]:
                canTake[neighbor]-=1
                # if takeable, add to queue
                if canTake[neighbor] <= 0:
                    courseQueue.append(neighbor)

        if numCourses != len(courseList):
            return []
        else:
            return courseList`,q={0:"[1,2]",1:"[3]",2:"[3]",3:"[]"},fe={0:[1,2],1:[3],2:[3],3:[]};function _(i,u,r,s){return[0,1,2,3].map(n=>({value:s[n],state:r.has(n)?"found":n===i?"active":u.has(n)?"visited":"default"}))}function Sr(){let i=[],r=[0,1,1,2],s=new Set,n=new Set,t=[],a=[];return i.push({explanation:"Course Schedule II: find the order to take all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]. Same Kahn's BFS as Course Schedule I, but now we record each dequeued course into courseList to build the result ordering. Cell values show each course's current in-degree.",highlightLine:15,state:{type:"array",cells:[0,1,2,3].map(e=>({value:r[e],state:"default"})),pointers:[{index:0,label:"course 0"},{index:1,label:"course 1"},{index:2,label:"course 2"},{index:3,label:"course 3"}],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:"[]"}]},variables:[{name:"numCourses",value:4},{name:"prerequisites",value:"[[1,0],[2,0],[3,1],[3,2]]"}]}),i.push({explanation:"Build canTake and prereqMap. For each [course, prereq]: canTake[course]++ and prereqMap[prereq].append(course). Result: canTake = [0,1,1,2], prereqMap = {0:[1,2], 1:[3], 2:[3]}. courseList starts empty \u2014 it will be filled as we take courses.",highlightLine:21,state:{type:"array",cells:[0,1,2,3].map(e=>({value:r[e],state:"default"})),pointers:[],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:"[]"}]},variables:[{name:"canTake",value:"[0,1,1,2]"},{name:"prereqMap",value:"{0:[1,2], 1:[3], 2:[3]}"},{name:"courseList",value:"[]"}]}),a.push(0),i.push({explanation:"Seed BFS queue: scan canTake for all indices with value 0. Only course 0 has in-degree 0. courseQueue = [0]. These are the courses with no prerequisites \u2014 our BFS entry points.",highlightLine:33,state:{type:"array",cells:_(0,new Set,new Set,r),pointers:[{index:0,label:"queued"}],hashmap:q,counters:[{label:"queue",value:"[0]"},{label:"result order",value:"[]"}]},variables:[{name:"courseQueue",value:"[0]"}]}),a.shift(),t.push(0),s.add(0),i.push({explanation:`BFS iteration 1: dequeue course 0. Append to courseList \u2192 courseList = [${t.join(", ")}]. Process neighbors [${fe[0].join(", ")}]: decrement their in-degrees since course 0 is now taken.`,highlightLine:42,state:{type:"array",cells:_(0,s,n,r),pointers:[{index:0,label:"taken"}],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"currentCourse",value:0},{name:"courseList",value:`[${t.join(", ")}]`}]}),r[1]--,r[2]--,a.push(1,2),i.push({explanation:"Decrement neighbors of course 0. canTake[1]: 1\u21920 (enqueue). canTake[2]: 1\u21920 (enqueue). Queue = [1, 2]. Both courses 1 and 2 are now available to take.",highlightLine:45,state:{type:"array",cells:_(null,s,n,r),pointers:[{index:1,label:"in-deg\u21920"},{index:2,label:"in-deg\u21920"}],hashmap:q,counters:[{label:"queue",value:"[1, 2]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"canTake[1]",value:r[1]},{name:"canTake[2]",value:r[2]}]}),a.shift(),t.push(1),s.add(1),i.push({explanation:`BFS iteration 2: dequeue course 1. Append to courseList \u2192 courseList = [${t.join(", ")}]. Process neighbors [${fe[1].join(", ")}]: decrement canTake[3].`,highlightLine:42,state:{type:"array",cells:_(1,s,n,r),pointers:[{index:1,label:"taken"}],hashmap:q,counters:[{label:"queue",value:"[2]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"currentCourse",value:1},{name:"courseList",value:`[${t.join(", ")}]`}]}),r[3]--,i.push({explanation:"canTake[3]: 2\u21921. Course 3 still needs course 2 \u2014 not yet takeable. Continue BFS.",highlightLine:45,state:{type:"array",cells:_(null,s,n,r),pointers:[{index:3,label:"in-deg\u21921"}],hashmap:q,counters:[{label:"queue",value:"[2]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"canTake[3]",value:r[3]}]}),a.shift(),t.push(2),s.add(2),i.push({explanation:`BFS iteration 3: dequeue course 2. Append to courseList \u2192 courseList = [${t.join(", ")}]. Process neighbors [${fe[2].join(", ")}]: decrement canTake[3].`,highlightLine:42,state:{type:"array",cells:_(2,s,n,r),pointers:[{index:2,label:"taken"}],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"currentCourse",value:2},{name:"courseList",value:`[${t.join(", ")}]`}]}),r[3]--,a.push(3),i.push({explanation:"canTake[3]: 1\u21920 \u2192 enqueue course 3. Both prerequisites for course 3 (courses 1 and 2) are now satisfied. Queue = [3].",highlightLine:48,state:{type:"array",cells:_(null,s,n,r),pointers:[{index:3,label:"in-deg\u21920"}],hashmap:q,counters:[{label:"queue",value:"[3]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"canTake[3]",value:r[3]}]}),a.shift(),t.push(3),n.add(3),i.push({explanation:`BFS iteration 4: dequeue course 3. Append to courseList \u2192 courseList = [${t.join(", ")}]. No neighbors. Queue empty \u2014 BFS complete.`,highlightLine:42,state:{type:"array",cells:_(3,s,n,r),pointers:[{index:3,label:"taken"}],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:`[${t.join(", ")}]`}]},variables:[{name:"currentCourse",value:3},{name:"courseList",value:`[${t.join(", ")}]`}]}),i.push({explanation:`Result: len(courseList) = ${t.length} == numCourses (4) \u2192 return [${t.join(", ")}]. This is a valid topological ordering. No cycle was detected. Another valid order would be [0,2,1,3]. If a cycle existed, courseList would be shorter than numCourses and we'd return []. O(V+E) time, O(V+E) space.`,highlightLine:53,state:{type:"array",cells:[0,1,2,3].map(e=>({value:t[e],state:"found"})),pointers:[],hashmap:q,counters:[{label:"queue",value:"[]"},{label:"result order",value:`[${t.join(", ")}]`},{label:"length check",value:`${t.length} == 4`}]},variables:[{name:"return",value:`[${t.join(", ")}]`,highlight:!0}]}),i}var Lr={label:"Kahn's BFS Topological Sort",pythonCode:kr,generateSteps:Sr},Lt={id:"course-schedule-ii",lcNumber:210,title:"Course Schedule II",difficulty:"Medium",category:"graphs",tags:["Topological Sort","BFS","Cycle Detection"],timeComplexity:"O(V+E)",spaceComplexity:"O(V+E)",description:"Given numCourses and prerequisites[i] = [a, b] (must take b before a), return the ordering of courses needed to finish all of them. If impossible (cycle), return an empty array.",examples:[{input:"numCourses = 2, prerequisites = [[1,0]]",output:"[0,1]",explanation:"Take course 0 first, then course 1."},{input:"numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",output:"[0,2,1,3]",explanation:"Course 0 first (no prereqs), then 1 and 2 in any order, then 3."},{input:"numCourses = 1, prerequisites = []",output:"[0]",explanation:"Single course, no prerequisites."}],constraints:["1 \u2264 numCourses \u2264 2000","0 \u2264 prerequisites.length \u2264 numCourses \xD7 (numCourses - 1)","prerequisites[i].length == 2","0 \u2264 ai, bi < numCourses","ai != bi","All prerequisite pairs are distinct."],hint:"Extend Course Schedule I: use Kahn's BFS but append each dequeued course to a result list. After BFS, if the result list has numCourses entries, return it (valid topological order). Otherwise a cycle exists \u2014 return []. The key insight: a cycle means some nodes can never reach in-degree 0.",solutions:[Lr]};var Or=`class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        # the question is really confusing
        # it is just asking to return a list of cells that can flow to both oceans
        # basically then we are doing DFS on every single cell and seeing if it can reach two of the 4 surfaces
        # preorder DFS as well since we need to make decision on current node
        # what we should do is start from each ocean instead and mark nodes as (canReachPacific, canReachAtlantic)
        # so we have a list of pacific nodes and a list of atlantic nodes
        # DFS on neighbors that are bigger, since we are starting from the end and then mark those nodes with (canReachPacific, canReachAtlantic)
        # we can't use a tuple because tuples are immutable, so we'll just do two sets

        canReachPacific = set()
        canReachAtlantic = set()

        rows = len(heights)
        cols = len(heights[0])

        # remember we are coming from outside
        # so previousHeight should be smaller than height we are going to
        def dfs(row, col, visitedSet, previousHeight):
            # this dfs is responsible for adding node to visited

            # typical base case first of going out of bounds or is already visited
            if (row,col) in visitedSet or row < 0 or row >= rows or col < 0 or col >= cols:
                return

            # if height is smaller than previousHeight, we don't continue as well
            if heights[row][col] < previousHeight:
                return

            # if valid, we will start with adding to visited
            visitedSet.add((row,col))

            # now let's go to the neighbors that have more height
            dfs(row+1, col, visitedSet, heights[row][col])
            dfs(row-1, col, visitedSet, heights[row][col])
            dfs(row, col+1, visitedSet, heights[row][col])
            dfs(row, col-1, visitedSet, heights[row][col])

        for row in range(rows):
            # we actually need to pass the set since we have two sets here
            # we actually also need to pass the previous height otherwise we can't tell if it can flow down or not
            # dfs starting from the left most column, which is pacific
            dfs(row, 0, canReachPacific, heights[row][0])
            # dfs starting from the top row, which is the atlantic
            dfs(row, cols - 1, canReachAtlantic, heights[row][cols-1])

        for col in range(cols):
            # first row, which is pacific ocean
            dfs(0, col, canReachPacific, heights[0][col])
            # last row, which is the atlantic ocean
            dfs(rows - 1, col, canReachAtlantic, heights[rows-1][col])

        result = []

        # now we go through and get everything that is in both sets
        for row in range(rows):
            for col in range(cols):
                if (row,col) in canReachAtlantic and (row,col) in canReachPacific:
                    result.append([row,col])

        return result`,P=[[1,2,2,3],[3,2,3,4],[2,4,5,3],[6,7,1,4]],ne=P.length,ie=P[0].length,ce=(i,u)=>`${i},${u}`;function Cr(){let i=[],u=new Set,r=new Set,s=[{state:"empty",label:"unreached"},{state:"visited",label:"Pacific"},{state:"queued",label:"Atlantic"},{state:"found",label:"Both = answer"},{state:"active",label:"current cell"}];function n(l){return{type:"grid",grid:P.map((h,d)=>h.map((c,p)=>{let m=ce(d,p),f="empty",g=u.has(m),v=r.has(m);return g&&v?f="found":g?f="visited":v&&(f="queued"),m===l&&(f="active"),{state:f,label:String(c)}})),legend:s,counters:[{label:"canReachPacific",value:u.size},{label:"canReachAtlantic",value:r.size}]}}function t(l,h,d,c){i.push({explanation:l,highlightLine:h,state:n(d),variables:[{name:"row",value:c.row??"\u2014"},{name:"col",value:c.col??"\u2014"},{name:"previousHeight",value:c.previousHeight??"\u2014"},{name:"visitedSet",value:c.setName??"\u2014"},{name:"canReachPacific.size",value:u.size,highlight:c.highlightSet&&c.setName==="canReachPacific"},{name:"canReachAtlantic.size",value:r.size,highlight:c.highlightSet&&c.setName==="canReachAtlantic"},...c.extra??[]]})}function a(l,h,d,c,p){let m=ce(l,h);d.has(m)||l<0||l>=ne||h<0||h>=ie||P[l][h]<p||(d.add(m),t(`dfs(${l}, ${h}) \u2014 height ${P[l][h]} \u2265 previousHeight ${p}, so water can flow back the way we came. Add (${l},${h}) to ${c}, then recurse down, up, right, left.`,32,m,{row:l,col:h,previousHeight:p,setName:c,highlightSet:!0}),a(l+1,h,d,c,P[l][h]),a(l-1,h,d,c,P[l][h]),a(l,h+1,d,c,P[l][h]),a(l,h-1,d,c,P[l][h]))}function e(l,h,d,c,p,m){let f=ce(l,h),g=P[l][h];if(d.has(f)){t(`dfs(${l}, ${h}) for ${p}: (${l},${h}) is already in ${c}, so the base case returns immediately.`,24,f,{row:l,col:h,previousHeight:g,setName:c});return}t(`Seed ${p}: call dfs(${l}, ${h}, ${c}, heights[${l}][${h}]=${g}). This border cell touches the ${p}, so anything we can climb to from here drains into it.`,m,f,{row:l,col:h,previousHeight:g,setName:c,extra:[{name:"phase",value:`${p} seed`,highlight:!0}]}),a(l,h,d,c,g)}t("Pacific Ocean borders the top row and left column; Atlantic borders the bottom row and right column. Instead of DFS from every cell, we DFS from the ocean edges and climb UPHILL \u2014 any cell we reach can drain back to that ocean. Two sets track reachability; we seed them by walking the borders, alternating one Pacific call and one Atlantic call per loop iteration. The legend below the grid shows what each color means.",12,void 0,{extra:[{name:"rows",value:ne},{name:"cols",value:ie}]});for(let l=0;l<ne;l++)e(l,0,u,"canReachPacific","Pacific",44),e(l,ie-1,r,"canReachAtlantic","Atlantic",46);for(let l=0;l<ie;l++)e(0,l,u,"canReachPacific","Pacific",50),e(ne-1,l,r,"canReachAtlantic","Atlantic",52);let o=[];for(let l=0;l<ne;l++)for(let h=0;h<ie;h++){let d=ce(l,h);r.has(d)&&u.has(d)&&o.push(`[${l},${h}]`)}return t("Both for-loops are done. Now scan every cell row by row and collect those present in BOTH canReachPacific and canReachAtlantic \u2014 the gold cells.",57,void 0,{extra:[{name:"result",value:"[]"}]}),t(`Result: ${o.join(", ")} \u2014 the gold "Both = answer" cells, which can drain to both oceans.`,62,void 0,{extra:[{name:"result",value:o.join(" "),highlight:!0}]}),i}var Ot={id:"pacific-atlantic-water-flow",lcNumber:417,title:"Pacific Atlantic Water Flow",difficulty:"Medium",category:"graphs",tags:["DFS","BFS","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"There is an m \xD7 n rectangular island that borders both the Pacific Ocean (top and left edges) and the Atlantic Ocean (bottom and right edges). Rain water flows to neighboring cells with height \u2264 current height, and can flow off the island edges into the ocean. Return a list of grid coordinates where water can flow to both the Pacific and Atlantic oceans.",examples:[{input:"heights = [[1,2,2,3],[3,2,3,4],[2,4,5,3],[6,7,1,4]]",output:"[[0,3],[1,3],[2,2],[3,0],[3,1]]",explanation:"These 5 cells can drain downhill to reach both ocean borders"},{input:"heights = [[1]]",output:"[[0,0]]",explanation:"Single cell borders both oceans"}],constraints:["m == heights.length","n == heights[r].length","1 \u2264 m, n \u2264 200","0 \u2264 heights[r][c] \u2264 10^5"],hint:"Instead of DFS from every cell (expensive), reverse the problem: start DFS from each ocean's border edges and expand to any neighbor with height >= current. The intersection of the two reachable sets is the answer.",solutions:[{label:"DFS (Reverse)",pythonCode:Or,generateSteps:Cr}]};var Mr=`import collections
from typing import List

class Solution:
    def floodFill(self, image: List[List[int]], sr: int, sc: int, color: int) -> List[List[int]]:
        # we are basically just doing BFS from one node and that's it
        # we actually need to save the original color of starting point so it can be compared

        originalColor = image[sr][sc]

        rows, cols = len(image), len(image[0])

        queue = collections.deque()

        queue.append((sr,sc))

        neighbors = [[1,0],[-1,0],[0,1],[0,-1]]

        while queue:
            # we can mark nodes as visited by just changing them to the color
            # so no need to have a visited set
            currentRow, currentCol = queue.popleft()
            image[currentRow][currentCol] = color
            # we now check currentNode's neighbors

            for rowInc, colInc in neighbors:
                neighborRow = currentRow + rowInc
                neighborCol = currentCol + colInc
                # if not out of bounds and was same color as original
                # we want to add it to queue
                # and also if originalColor != color
                if (neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols
                    and image[neighborRow][neighborCol] == originalColor
                    and originalColor != color):
                    queue.append((neighborRow, neighborCol))

        return image`,Tr=[[1,1,1],[1,1,0],[1,0,1]],se=1,re=1,W=2;function Nr(){let i=[],u=Tr.map(d=>[...d]),r=u.length,s=u[0].length,n=u[se][re],t=[[se,re]],a=new Set,e=(d,c)=>`${d},${c}`,o=[{state:"land",label:`original color (${n})`},{state:"empty",label:"other color (barrier)"},{state:"queued",label:"in queue"},{state:"active",label:"being painted"},{state:"visited",label:`painted to ${W}`}];function l(d){let c=new Set(t.map(([p,m])=>e(p,m)));return{type:"grid",grid:u.map((p,m)=>p.map((f,g)=>{let v=e(m,g),w="empty";return a.has(v)?w="visited":c.has(v)?w="queued":f===n&&(w="land"),v===d&&(w="active"),{state:w,label:String(f)}})),legend:o,counters:[{label:"queue",value:t.length?t.map(([p,m])=>`(${p},${m})`).join(" "):"empty"},{label:"painted",value:a.size}]}}function h(d,c,p,m){i.push({explanation:d,highlightLine:c,state:l(p),variables:[{name:"currentRow",value:m.row??"\u2014"},{name:"currentCol",value:m.col??"\u2014"},{name:"originalColor",value:n},{name:"color",value:W},{name:"queue",value:t.length?t.map(([f,g])=>`(${f},${g})`).join(" "):"[]"}]})}for(h(`Flood fill from (${se},${re}) with new color ${W}. Save originalColor = image[${se}][${re}] = ${n}, then seed the BFS queue with the start pixel. No visited set is needed \u2014 painting a pixel to ${W} is itself the "visited" mark.`,15,e(se,re),{});t.length;){let[d,c]=t.shift(),p=e(d,c),m=a.has(p);u[d][c]=W,a.add(p);let f=[],g=[];for(let[$,Y]of[[1,0],[-1,0],[0,1],[0,-1]]){let T=d+$,B=c+Y;if(T<0||T>=r||B<0||B>=s){g.push(`(${T},${B}) out of bounds`);continue}if(u[T][B]!==n||n===W){g.push(`(${T},${B})=${u[T][B]} \u2260 ${n}`);continue}t.push([T,B]),f.push(`(${T},${B})`)}let v=m?` Note: (${d},${c}) was enqueued twice \u2014 the guard checks the pixel at enqueue time, but painting happens at dequeue, so a cell can enter the queue from two different neighbors before either paints it. The repaint is a harmless no-op.`:"",w=f.length?`Enqueue ${f.join(", ")}.`:"No neighbors qualify.",b=g.length?` Skipped: ${g.join("; ")}.`:"";h(`Dequeue (${d},${c}) and paint it to ${W}. Check neighbors down, up, right, left. ${w}${b}${v}`,23,p,{row:d,col:c})}return h(`Queue is empty \u2014 every pixel connected to the start by the original color ${n} is now painted ${W}. Return image = [${u.map(d=>`[${d.join(",")}]`).join(",")}]. The bottom-right 1 stays untouched: it is only diagonally adjacent, and flood fill spreads horizontally and vertically only.`,37,void 0,{}),i}var Ct={id:"flood-fill",lcNumber:733,title:"Flood Fill",difficulty:"Easy",category:"graphs",tags:["BFS","DFS","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"You are given an image represented by an m \xD7 n grid of integers, where image[i][j] is the pixel value. Starting from pixel (sr, sc), perform a flood fill: change the starting pixel to the new color, then repeat for every horizontally or vertically adjacent pixel that shares the original color of the starting pixel. Return the modified image.",examples:[{input:"image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2",output:"[[2,2,2],[2,2,0],[2,0,1]]",explanation:"All pixels 4-directionally connected to (1,1) through color 1 become 2. The bottom-right 1 is only diagonally connected, so it stays."},{input:"image = [[0,0,0],[0,0,0]], sr = 0, sc = 0, color = 0",output:"[[0,0,0],[0,0,0]]",explanation:"The new color equals the original color, so nothing changes."}],constraints:["m == image.length","n == image[i].length","1 \u2264 m, n \u2264 50","0 \u2264 image[i][j], color < 2^16","0 \u2264 sr < m, 0 \u2264 sc < n"],hint:"BFS (or DFS) from the start pixel. Save the original color first, then expand to 4-directional neighbors that still have it. Painting a pixel doubles as marking it visited \u2014 but guard against color == originalColor or the loop never terminates.",solutions:[{label:"BFS (Queue)",pythonCode:Mr,generateSteps:Nr}]};var Ir=`class Solution:
    def solve(self, board: List[List[str]]) -> None:
        # so the idea is that if an O is connected to the edge
        # any of its neighbors with an O is considered safe
        # so it is the same idea as pacific/atlantic water flow
        # we want to start at the 4 sides
        # do BFS and mark those nodes as safe
        # so let's get all the Os on the edges and put them into a queue

        rows, cols = len(board), len(board[0])

        safeQueue = collections.deque()

        # left and right side
        for row in range(rows):
            # if O, add to safeQueue
            if board[row][0] == 'O':
                safeQueue.append((row,0))
            if board[row][cols-1] == 'O':
                safeQueue.append((row,cols-1))

        # top and bottom
        for col in range(cols):
            # if O, add to safeQueue
            if board[0][col] == 'O':
                safeQueue.append((0,col))
            if board[rows-1][col] == 'O':
                safeQueue.append((rows-1,col))

        # now that we have our safe nodes to start
        # we want to BFS and mark them as 'Safe'
        # then anything not marked after that, we'll just change to 'X'

        neighbors = [[1,0],[-1,0],[0,1],[0,-1]]

        while safeQueue:
            currentRow, currentCol = safeQueue.popleft()
            # we'll set it to S temporarily to mark as visited and safe
            board[currentRow][currentCol] = 'S'

            # now we check the neighbors of this node
            for neighbor in neighbors:
                rowInc = neighbor[0]
                colInc = neighbor[1]
                neighborRow = currentRow + rowInc
                neighborCol = currentCol + colInc
                # if not out of bound and value is O, add to queue
                if neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols and board[neighborRow][neighborCol] == 'O':
                    safeQueue.append((neighborRow,neighborCol))

        # now that we marked all safe nodes as safe
        # we want to go through the board once again and put all Os to Xs and then S to Os

        for row in range(rows):
            for col in range(cols):
                if board[row][col] == 'O':
                    board[row][col] = 'X'
                elif board[row][col] == 'S':
                    board[row][col] = 'O'`;function qr(){let r=[],s=(l,h)=>`${l},${h}`,n=[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]],t=new Set,a=new Set,e=(l=new Map)=>({type:"grid",grid:n.map((h,d)=>h.map((c,p)=>{let m=s(d,p);return l.has(m)?{state:l.get(m)}:t.has(m)?{state:"visited"}:a.has(m)?{state:"queued"}:c==="X"?{state:"water"}:{state:"land"}})),legend:[{state:"water",label:"X (wall)"},{state:"land",label:"O (region)"},{state:"queued",label:"in safeQueue"},{state:"visited",label:"S (safe)"},{state:"found",label:"captured \u2192 X"}]});r.push({explanation:"Key insight: any 'O' touching a border can never be captured. Strategy: seed a BFS from every border 'O', mark connected 'O' regions as safe ('S'), then flip all remaining 'O' to 'X'.",highlightLine:3,state:e(),variables:[{name:"rows",value:4},{name:"cols",value:4},{name:"safeQueue",value:"\u2205"}]}),r.push({explanation:"Scan left edge (col 0) and right edge (col 3). Every cell on both sides is 'X' \u2014 nothing added to safeQueue yet.",highlightLine:15,state:e(),variables:[{name:"scanning",value:"left + right edges"},{name:"safeQueue",value:"\u2205"}]}),r.push({explanation:"Scan top edge (row 0). All four cells are 'X' \u2014 nothing to add.",highlightLine:23,state:e(),variables:[{name:"scanning",value:"top edge (row 0)"},{name:"safeQueue",value:"\u2205"}]}),a.add(s(3,1)),r.push({explanation:"Scan bottom edge (row 3): (3,0)='X', (3,1)='O' \u2190 border 'O'! Add (3,1) to safeQueue. (3,2)='X', (3,3)='X'. We now have one BFS seed.",highlightLine:27,state:e(),variables:[{name:"scanning",value:"bottom edge (row 3)"},{name:"safeQueue",value:"[(3,1)]"}]}),a.delete(s(3,1)),t.add(s(3,1)),n[3][1]="S",r.push({explanation:"BFS: pop (3,1). Set board[3][1] = 'S' (safe, shown green). Check 4 neighbors: up (2,1)='X', down (4,1)=out-of-bounds, left (3,0)='X', right (3,2)='X'. No 'O' neighbors \u2014 nothing new enqueued.",highlightLine:37,state:e(),variables:[{name:"currentRow",value:3,highlight:!0},{name:"currentCol",value:1,highlight:!0},{name:"safeQueue",value:"\u2205"}]}),r.push({explanation:"safeQueue is empty \u2014 BFS complete. Only (3,1) is safe. The interior cluster at (1,1), (1,2), (2,2) has no path to any edge: it is fully surrounded and will be captured.",highlightLine:36,state:e(),variables:[{name:"safe cells",value:"(3,1)"},{name:"surrounded",value:"(1,1), (1,2), (2,2)"}]});let o=new Map([[s(1,1),"found"],[s(1,2),"found"],[s(2,2),"found"]]);return r.push({explanation:"Final pass \u2014 scan every cell. board[1][1]='O' \u2192 captured \u2192 'X'. board[1][2]='O' \u2192 captured \u2192 'X'. board[2][2]='O' \u2192 captured \u2192 'X'. These three cells have no escape to the border.",highlightLine:57,state:e(o),variables:[{name:"captured",value:"(1,1), (1,2), (2,2)",highlight:!0}]}),n[1][1]="X",n[1][2]="X",n[2][2]="X",r.push({explanation:"Final pass continued: board[3][1]='S' \u2192 restore to 'O'. It was border-connected, so it survives. The board is now fully updated in-place.",highlightLine:59,state:e(),variables:[{name:"restored",value:"(3,1) \u2192 O",highlight:!0}]}),t.delete(s(3,1)),n[3][1]="O",r.push({explanation:"Done. Three interior 'O' cells were captured to 'X'. The border-connected 'O' at (3,1) is preserved. Time: O(m\xD7n) \u2014 two linear passes. Space: O(m\xD7n) \u2014 BFS queue in the worst case.",highlightLine:54,state:e(),variables:[{name:"result",value:"board modified in-place",highlight:!0}]}),r}var Rr=`def solve_20260621_UnionFind(self, board: List[List[str]]) -> None:
    # Union Find version of 130
    # so the general idea behind union find method is that we are grouping them into components and any component not connected to the virtual node is gone
    # we want to create an extra node outside to help us mark the edge lands as safe
    # this node will be our base root parent for union find
    # but we are not creating a new node per say, we are creating a virtual node
    # which means it will have a rank and a parent but never exist in the board
    # we also want to flatten the 2D array structure to 1D
    # 2D -> 1D : (row, col) -> row * cols + col (index)
    # 1D -> 2D: row = index // cols, col = index % cols
    # nodes in 1D would go up to rows * cols, excluding rows * cols
    # so we will assign the extra node with rows * cols

    rows = len(board)
    cols = len(board[0])

    rankMap = {}
    parentMap = {}

    # 1D map representation for parent and rank map
    for i in range(rows * cols + 1):
        parentMap[i] = i
        rankMap[i] = 0

    def findParent(node):
        if node == parentMap[node]:
            return parentMap[node]
        parentMap[node] = findParent(parentMap[node])
        return parentMap[node]

    # union two nodes
    def union(node1,node2):
        node1Root = findParent(node1)
        node2Root = findParent(node2)
        if node1Root == node2Root:
            return False
        if rankMap[node1Root] > rankMap[node2Root]:
            parentMap[node2Root] = node1Root
        elif rankMap[node1Root] < rankMap[node2Root]:
            parentMap[node1Root] = node2Root
        else:
            # random assignment
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    neighbors = [[1,0],[-1,0],[0,1],[0,-1]]

    # Connect the nodes that are on the edge
    # to the virtual node
    for row in range(rows):
        for col in range(cols):
            current1DNode = row * cols + col
            virtual1DNode = rows * cols
            if board[row][col] == 'O':
                if row == 0 or row == rows - 1 or col == 0 or col == cols - 1:
                    union(current1DNode, virtual1DNode)
                # union the neighbors as well
                for ir, ic in neighbors:
                    nr, nc = row+ir, col+ic
                    if nr >= 0 and nr < rows and nc >= 0 and nc < cols and board[nr][nc] == 'O':
                        neighbor1DNode = nr * cols + nc
                        union(current1DNode, neighbor1DNode)

    # now that we have unioned all the safe nodes
    # we mark all the Os that have not been saved as water
    for row in range(rows):
        for col in range(cols):
            current1DNode = row * cols + col
            virtual1DNode = rows * cols
            if board[row][col] == 'O' and findParent(current1DNode) != findParent(virtual1DNode):
                board[row][col] = 'X'`;function Pr(){let i=[],u=[{id:"1,1",x:100,y:80},{id:"1,2",x:240,y:80},{id:"2,2",x:240,y:190},{id:"3,1",x:100,y:280},{id:"B",x:370,y:175}],r=[["3,1","B"],["1,1","1,2"],["1,2","2,2"]],s=["default","default","default","default","default"],n=["default","default","default"],t={"1,1":"1,1","1,2":"1,2","2,2":"2,2","3,1":"3,1",B:"B"},a={"1,1":0,"1,2":0,"2,2":0,"3,1":0,B:0},e=()=>({type:"graph",nodes:u.map((o,l)=>x(y({},o),{state:s[l]})),edges:r.map(([o,l],h)=>({from:o,to:l,state:n[h]})),hashmapLabel:"parentMap",hashmap:y({},t),hashmap2Label:"rankMap",hashmap2:y({},a)});return i.push({explanation:"Flatten the 2D board to 1D (cell (r,c) \u2192 r*cols+c) and add one virtual border node B = rows*cols. Initialize Union Find: parentMap[i]=i, rankMap[i]=0. Key insight: any O cell that ends up unioned with B is 'safe' \u2014 every O NOT connected to B gets flipped to X.",highlightLine:21,state:e(),variables:[{name:"n",value:16},{name:"virtual node B",value:"idx 16"}]}),s[3]="active",s[4]="active",n[0]="active",i.push({explanation:"Pass 1: scan all cells; (3,1) is an 'O' on the border (bottom row), so union((3,1), B). findParent(3,1)=3,1, findParent(B)=B. Ranks equal \u2192 else branch.",highlightLine:57,state:e(),variables:[{name:"border O found",value:"(3,1)",highlight:!0}]}),t.B="3,1",a["3,1"]=1,s[3]="found",s[4]="found",n[0]="found",i.push({explanation:"Equal ranks \u2192 parentMap[B]=(3,1), rankMap[(3,1)]\u21921. B is now a child of (3,1). Both are in the safe component (green). Any O that later unions into this component survives.",highlightLine:43,state:e(),variables:[{name:"parentMap[B]",value:"(3,1)",highlight:!0},{name:"rankMap[(3,1)]",value:1,highlight:!0}]}),s[0]="active",s[1]="active",n[1]="active",i.push({explanation:"Still pass 1: for each O cell we also union it with adjacent O neighbors. (1,1) and (1,2) are both O and adjacent \u2192 union((1,1),(1,2)). findParent(1,1)=1,1, findParent(1,2)=1,2. Ranks equal \u2192 else branch.",highlightLine:63,state:e(),variables:[{name:"union",value:"(1,1) \u2194 (1,2)",highlight:!0}]}),t["1,2"]="1,1",a["1,1"]=1,s[0]="visited",s[1]="visited",n[1]="visited",i.push({explanation:"Equal ranks \u2192 parentMap[(1,2)]=(1,1), rankMap[(1,1)]\u21921. {(1,1),(1,2)} share root (1,1). This cluster is not yet connected to B \u2014 still potentially surrounded.",highlightLine:43,state:e(),variables:[{name:"parentMap[(1,2)]",value:"(1,1)",highlight:!0},{name:"component",value:"{(1,1),(1,2)}, root=(1,1)"}]}),s[1]="active",s[2]="active",n[2]="active",i.push({explanation:"(1,2) and (2,2) are adjacent O cells \u2192 union((1,2),(2,2)). findParent((1,2))=(1,1) via path compression. findParent((2,2))=(2,2). rankMap[(1,1)]=1 > rankMap[(2,2)]=0.",highlightLine:63,state:e(),variables:[{name:"union",value:"(1,2) \u2194 (2,2)",highlight:!0},{name:"findParent((1,2))",value:"(1,1) via compression"}]}),t["2,2"]="1,1",s[1]="visited",s[2]="visited",n[2]="visited",i.push({explanation:"rankMap[(1,1)] > rankMap[(2,2)] \u2192 parentMap[(2,2)]=(1,1). All three interior O cells share root (1,1). Is (1,1) connected to B? findParent((1,1))=(1,1), findParent(B)=(3,1). Different roots \u2192 this cluster is completely surrounded.",highlightLine:39,state:e(),variables:[{name:"parentMap[(2,2)]",value:"(1,1)",highlight:!0},{name:"findParent(B)",value:"(3,1)"},{name:"findParent((1,1))",value:"(1,1) \u2260 (3,1)"}]}),s[0]="active",s[1]="active",s[2]="active",i.push({explanation:"Final pass: for each O cell, if findParent(cell) \u2260 findParent(B) \u2192 flip to X. findParent(B)=(3,1). (1,1),(1,2),(2,2) all have root (1,1) \u2260 (3,1) \u2192 captured. (3,1) has root (3,1) = findParent(B) \u2192 stays O. Time: O(m\xD7n\xB7\u03B1(m\xD7n)), Space: O(m\xD7n).",highlightLine:72,state:e(),variables:[{name:"captured",value:"(1,1), (1,2), (2,2)",highlight:!0},{name:"safe",value:"(3,1)"}]}),i}var Mt={id:"surrounded-regions",lcNumber:130,title:"Surrounded Regions",difficulty:"Medium",category:"graphs",tags:["BFS","Union Find","Matrix"],timeComplexity:"O(m \xD7 n)",spaceComplexity:"O(m \xD7 n)",description:"Given an m \xD7 n board of 'X' and 'O', capture all 'O' regions completely surrounded by 'X'. A region is surrounded if none of its 'O' cells touch the board edge. Flip captured cells to 'X' in-place.",examples:[{input:'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',output:'[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',explanation:"Interior O cluster is captured. The O at (3,1) touches the bottom edge and survives."}],constraints:["m == board.length","n == board[i].length","1 \u2264 m, n \u2264 200","board[i][j] is 'X' or 'O'"],hint:"Which 'O' cells can never be captured? Find the ones that are NOT surrounded. For Union Find: add a virtual border node B \u2014 union every border O with B, then union all adjacent O pairs. Any O cell not connected to B at the end gets flipped.",solutions:[{label:"Union Find",pythonCode:Rr,generateSteps:Pr,timeComplexity:"O(m\xD7n \xB7 \u03B1(m\xD7n))",spaceComplexity:"O(m\xD7n)"},{label:"BFS",pythonCode:Ir,generateSteps:qr,timeComplexity:"O(m\xD7n)",spaceComplexity:"O(m\xD7n)"}]};var Ar=`class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        # first thought is that we iterate through n
        # bfs on each node and mark them as visited as we visit them
        # each time bfs comes back, we basically have a component
        # we should also have an adjMap

        componentCounter = 0

        visited = set()

        adjMap = collections.defaultdict(list)

        for node1, node2 in edges:
            adjMap[node1].append(node2)
            adjMap[node2].append(node1)

        def bfs(node):
            queue = collections.deque()

            queue.append(node)

            visited.add(node)

            while queue:
                # pop node from queue
                currentNode = queue.popleft()
                # mark node as visited
                visited.add(currentNode)
                # add neighbors to the queue
                for neighbor in adjMap[currentNode]:
                    if neighbor not in visited:
                        queue.append(neighbor)

        for i in range(n):
            if i not in visited:
                bfs(i)
                componentCounter+=1

        return componentCounter`;function jr(){let u=[[0,1],[1,2],[3,4]],r=[],s=[{id:0,x:60,y:130},{id:1,x:160,y:130},{id:2,x:260,y:130},{id:3,x:375,y:90},{id:4,x:375,y:170}],n=new Array(5).fill("default"),t=new Array(u.length).fill("default"),a=0,e=o=>({type:"graph",nodes:s.map((l,h)=>x(y({},l),{state:n[h]})),edges:u.map(([l,h],d)=>({from:l,to:h,state:t[d]})),stackItems:o.map(String),stackLabel:"queue",counters:[{label:"components",value:a}]});return r.push({explanation:"Build adjacency map from edges. 0\u2192[1], 1\u2192[0,2], 2\u2192[1], 3\u2192[4], 4\u2192[3]. Then scan nodes 0..4: each unvisited node starts one BFS that marks an entire component.",highlightLine:14,state:e([]),variables:[{name:"n",value:5},{name:"edges",value:"[[0,1],[1,2],[3,4]]"},{name:"componentCounter",value:0}]}),n[0]="found",r.push({explanation:"i=0 not in visited \u2192 call bfs(0). Enqueue node 0 and mark it visited.",highlightLine:37,state:e([0]),variables:[{name:"i",value:0,highlight:!0},{name:"queue",value:"[0]"},{name:"visited",value:"{0}"}]}),n[0]="active",n[1]="found",t[0]="active",r.push({explanation:"Pop node 0. adj[0]=[1]. Node 1 unvisited \u2192 enqueue and mark visited.",highlightLine:27,state:e([1]),variables:[{name:"currentNode",value:0,highlight:!0},{name:"adj[0]",value:"[1]"},{name:"queue",value:"[1]"}]}),n[0]="visited",n[1]="active",n[2]="found",t[0]="visited",t[1]="active",r.push({explanation:"Pop node 1. adj[1]=[0,2]. Node 0 already visited. Node 2 unvisited \u2192 enqueue.",highlightLine:27,state:e([2]),variables:[{name:"currentNode",value:1,highlight:!0},{name:"adj[1]",value:"[0, 2]"},{name:"queue",value:"[2]"}]}),n[1]="visited",n[2]="active",t[1]="visited",r.push({explanation:"Pop node 2. adj[2]=[1]. Node 1 already visited. Queue empty \u2014 component {0,1,2} fully explored.",highlightLine:27,state:e([]),variables:[{name:"currentNode",value:2,highlight:!0},{name:"adj[2]",value:"[1]"},{name:"queue",value:"\u2205"}]}),n[2]="visited",a=1,r.push({explanation:"bfs(0) returned. Increment componentCounter \u2192 1. Component {0,1,2} discovered.",highlightLine:38,state:e([]),variables:[{name:"componentCounter",value:1,highlight:!0},{name:"component 1",value:"{0, 1, 2}"}]}),n[3]="found",r.push({explanation:"i=1,2 already visited. i=3 unvisited \u2192 call bfs(3). Enqueue node 3.",highlightLine:37,state:e([3]),variables:[{name:"i",value:3,highlight:!0},{name:"queue",value:"[3]"}]}),n[3]="active",n[4]="found",t[2]="active",r.push({explanation:"Pop node 3. adj[3]=[4]. Node 4 unvisited \u2192 enqueue.",highlightLine:27,state:e([4]),variables:[{name:"currentNode",value:3,highlight:!0},{name:"adj[3]",value:"[4]"},{name:"queue",value:"[4]"}]}),n[3]="visited",n[4]="active",t[2]="visited",r.push({explanation:"Pop node 4. adj[4]=[3]. Node 3 already visited. Queue empty \u2014 component {3,4} fully explored.",highlightLine:27,state:e([]),variables:[{name:"currentNode",value:4,highlight:!0},{name:"adj[4]",value:"[3]"},{name:"queue",value:"\u2205"}]}),n[4]="visited",a=2,r.push({explanation:"bfs(3) returned. Increment componentCounter \u2192 2. i=4 already visited \u2014 outer loop ends.",highlightLine:38,state:e([]),variables:[{name:"componentCounter",value:2,highlight:!0},{name:"component 2",value:"{3, 4}"}]}),r.push({explanation:"Return 2. Two connected components: {0\u20131\u20132} and {3\u20134}. Every node and edge visited exactly once \u2014 O(n + e) time, O(n + e) space.",highlightLine:40,state:e([]),variables:[{name:"result",value:2,highlight:!0}]}),r}var Er=`def countComponents(self, n: int, edges: List[List[int]]) -> int:
    # union find solution
    # since we are given n nodes, we can say that we started out with n components
    # then we try to merge as many as we can and when we cannot anymore, we decrement component counter
    # then we return the end component counter

    parentMap, rankMap = {}, {}
    componentCounter = n

    # initialize parent and rank maps
    for i in range(n):
        parentMap[i] = i
        rankMap[i] = 0

    # path compression
    def findParent(node):
        if node == parentMap[node]:
            return parentMap[node]
        parentMap[node] = findParent(parentMap[node])
        return parentMap[node]

    # union by rank
    def unionByRank(node1, node2):
        node1Root = findParent(node1)
        node2Root = findParent(node2)
        if node1Root == node2Root:
            return False

        if rankMap[node1Root] > rankMap[node2Root]:
            parentMap[node2Root] = node1Root
        elif rankMap[node2Root] > rankMap[node1Root]:
            parentMap[node1Root] = node2Root
        else:
            # if equal, pick a random one to rank up
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        # if we can connect, subtract 1 from component counter
        if unionByRank(node1, node2):
            componentCounter-=1

    return componentCounter`;function Fr(){let u=[[0,1],[1,2],[3,4]],r=[],s=[{id:0,x:60,y:130},{id:1,x:160,y:130},{id:2,x:260,y:130},{id:3,x:375,y:90},{id:4,x:375,y:170}],n=new Array(5).fill("default"),t=new Array(u.length).fill("default"),a=[0,1,2,3,4],e=[0,0,0,0,0],o=5,l=()=>({type:"graph",nodes:s.map((h,d)=>x(y({},h),{state:n[d]})),edges:u.map(([h,d],c)=>({from:h,to:d,state:t[c]})),hashmapLabel:"parentMap",hashmap:Object.fromEntries(a.map((h,d)=>[String(d),h])),hashmap2Label:"rankMap",hashmap2:Object.fromEntries(e.map((h,d)=>[String(d),h])),counters:[{label:"components",value:o}]});return r.push({explanation:"componentCounter=5 (n=5 isolated nodes). parentMap[i]=i, rankMap[i]=0 \u2014 each node is its own root. Each successful union decrements the count.",highlightLine:11,state:l(),variables:[{name:"n",value:5},{name:"componentCounter",value:5}]}),n[0]="active",n[1]="active",t[0]="active",r.push({explanation:"Edge [0,1]: findParent(0)=0 (own root), findParent(1)=1 (own root). Roots differ \u2014 no cycle, safe to union.",highlightLine:24,state:l(),variables:[{name:"node1Root",value:0},{name:"node2Root",value:1}]}),a[1]=0,e[0]=1,o=4,n[0]="visited",n[1]="found",t[0]="visited",r.push({explanation:"Ranks equal \u2192 else branch: parentMap[1]=0, rankMap[0]\u21921. componentCounter\u21924. Node 1 is now a child of root 0.",highlightLine:35,state:l(),variables:[{name:"componentCounter",value:4,highlight:!0}]}),n[1]="active",n[2]="active",t[1]="active",r.push({explanation:"Edge [1,2]: findParent(1)\u2192parentMap[1]=0\u2192parentMap[0]=0 (path compression). findParent(2)=2. Roots 0 vs 2 \u2014 safe to union.",highlightLine:24,state:l(),variables:[{name:"node1Root",value:0},{name:"node2Root",value:2}]}),a[2]=0,o=3,n[1]="found",n[2]="found",t[1]="visited",r.push({explanation:"rankMap[0]=1 > rankMap[2]=0 \u2192 if branch: parentMap[2]=0. componentCounter\u21923. All of {0,1,2} share root 0.",highlightLine:30,state:l(),variables:[{name:"componentCounter",value:3,highlight:!0}]}),n[3]="active",n[4]="active",t[2]="active",r.push({explanation:"Edge [3,4]: findParent(3)=3, findParent(4)=4. Both self-roots \u2014 safe to union.",highlightLine:24,state:l(),variables:[{name:"node1Root",value:3},{name:"node2Root",value:4}]}),a[4]=3,e[3]=1,o=2,n[3]="visited",n[4]="found",t[2]="visited",r.push({explanation:"Ranks equal \u2192 else branch: parentMap[4]=3, rankMap[3]\u21921. componentCounter\u21922. {3,4} share root 3.",highlightLine:35,state:l(),variables:[{name:"componentCounter",value:2,highlight:!0}]}),r.push({explanation:"All edges processed. Two distinct roots \u2014 0 (for {0,1,2}) and 3 (for {3,4}). Return 2. O(n\xB7\u03B1(n)) time.",highlightLine:44,state:l(),variables:[{name:"result",value:2,highlight:!0}]}),r}var Tt={id:"number-of-connected-components",lcNumber:323,title:"Number of Connected Components in an Undirected Graph",difficulty:"Medium",category:"graphs",tags:["BFS","Union Find"],timeComplexity:"O(n + e)",spaceComplexity:"O(n + e)",description:"Given n nodes (0 to n\u22121) and a list of undirected edges, return the number of connected components in the graph.",examples:[{input:"n = 5, edges = [[0,1],[1,2],[3,4]]",output:"2",explanation:"Nodes {0,1,2} form one component; {3,4} form another."},{input:"n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]",output:"1",explanation:"All nodes are connected in a single chain."}],constraints:["1 \u2264 n \u2264 2000","1 \u2264 edges.length \u2264 5000","edges[i].length == 2","0 \u2264 a\u1D62 \u2264 b\u1D62 < n","No repeated edges"],hint:"Start with n components. For each edge, union the two endpoints \u2014 if they share a root, skip; otherwise merge and decrement the count. Union Find with path compression and union by rank runs in near-constant time per operation.",solutions:[{label:"Union Find",pythonCode:Er,generateSteps:Fr,timeComplexity:"O(n \xB7 \u03B1(n))",spaceComplexity:"O(n)"},{label:"BFS",pythonCode:Ar,generateSteps:jr,timeComplexity:"O(n + e)",spaceComplexity:"O(n + e)"}]};var Dr=`def validTree(self, n: int, edges: List[List[int]]) -> bool:
    # so we basically need to return whether or not this has a cycle
    # [[0,1],[1,2],[2,0]] would be invalid because 2 leads back to 0
    # so we can have a visited set and do adjacency map based on the input
    # we also need to verify all nodes are traversed since a disconnected node also means not a tree

    # visited means we have already gone this route
    # so we need to dfs on currentNode, parentNode
    # this way we know which direction we went
    visited = set()

    adjMap = collections.defaultdict(list)

    # notice that this is bidirectional
    # so we have to do adjMap both ways
    for firstNode, secondNode in edges:
        adjMap[firstNode].append(secondNode)
        adjMap[secondNode].append(firstNode)

    def dfs(currentNode, parentNode):
        # if we have seen this node, we are in a cycle thus return False
        if currentNode in visited:
            return False

        # if we haven't seen this node yet
        # let's add it to visited
        visited.add(currentNode)

        # now let's take a look at its neighbors
        for neighbor in adjMap[currentNode]:
            # neighbor will always have the same pair the opposite way
            # so we need to ignore that one
            if neighbor == parentNode:
                continue
            if not dfs(neighbor, currentNode):
                return False
        return True

    return dfs(0,-1) and len(visited) == n`,Br=`def validTree(self, n: int, edges: List[List[int]]) -> bool:
    # a tree is non-cyclic and is connected to every node
    # so we need to make sure we traversed through all nodes
    # so we should have a counter for how many nodes we've visited
    # we can actually use union find here
    # so we need parent map and rank map
    # from graph theory, we know that given n nodes
    # there will always be n - 1 edges

    if len(edges) != n - 1:
        return False

    parentMap = {}
    rankMap = {}

    # initialization phase
    # set parent to self
    # set rank to 0
    for i in range(n):
        parentMap[i] = i
        rankMap[i] = 0

    # find the root of node
    # this is path compression
    def find(node):
        # base case
        if parentMap[node] == node:
            return parentMap[node]
        # if we have an actual parent, let's find the root parent
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    # see if we can merge two nodes without making a cycle
    def union(node1, node2):
        # we first find the root parent of both nodes
        node1Root = find(node1)
        node2Root = find(node2)
        # if the root parents are the same, we are in a cycle
        if node1Root == node2Root:
            return False
        # otherwise, we check the rank of each and merge them

        if rankMap[node1Root] > rankMap[node2Root]:
            parentMap[node2Root] = node1Root
        elif rankMap[node2Root] > rankMap[node1Root]:
            parentMap[node1Root] = node2Root
        else:
            # if equal rank, then pick a random one to be parent and promote rank
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        if not union(node1, node2):
            return False

    return True`;var Z=[[0,1],[0,2],[0,3],[1,4]],Nt=[{id:0,x:220,y:90},{id:1,x:100,y:190},{id:2,x:220,y:240},{id:3,x:340,y:190},{id:4,x:40,y:290}];function Hr(){let i=[],u=new Array(Z.length).fill("default"),r={};for(let d=0;d<5;d++)r[d]=[];for(let[d,c]of Z)r[d].push(c),r[c].push(d);let s=(d,c)=>Z.findIndex(([p,m])=>p===d&&m===c||p===c&&m===d),n=new Set,t=[],a=0,e=(d,c=!1)=>({type:"graph",nodes:Nt.map((p,m)=>x(y({},p),{state:c?"found":m===d?"active":n.has(m)?"visited":"default"})),edges:Z.map(([p,m],f)=>({from:p,to:m,state:c?"found":u[f]})),hashmapLabel:"visited",hashmap:Object.fromEntries([...n].sort((p,m)=>p-m).map(p=>[String(p),"\u2713"])),stackLabel:"call stack",stackItems:[...t],counters:[{label:"len(visited)",value:n.size}]});i.push({explanation:"DFS approach: a graph is a valid tree iff it has no cycle AND every node is reachable. Build a bidirectional adjacency map, then DFS from node 0 while remembering the parent we came from. If we ever reach an already-visited node that isn't the parent, that's a cycle. At the end, len(visited) == n confirms everything is connected.",highlightLine:16,state:e(null),variables:[{name:"n",value:5},{name:"edges",value:"[[0,1],[0,2],[0,3],[1,4]]"},{name:"adjMap",value:"{0:[1,2,3], 1:[0,4], 2:[0], 3:[0], 4:[1]}"}]});function o(d,c){if(a++,t.push(`dfs(${d}, p=${c})`),n.has(d))return i.push({explanation:`dfs(${d}, parent=${c}): node ${d} is ALREADY in visited, and we didn't get here via its parent \u2014 that means a cycle. Return False.`,highlightLine:22,state:e(d),variables:[{name:"currentNode",value:d},{name:"in visited?",value:"YES \u2192 cycle",highlight:!0}]}),a--,t.pop(),!1;n.add(d),i.push({explanation:`Call dfs(${d}, parent=${c}) \u2014 push on the call stack (depth ${a}). ${d} isn't in visited, so add it \u2192 visited = {${[...n].sort((p,m)=>p-m).join(", ")}}. Now look at ${d}'s neighbors: [${r[d].join(", ")}].`,highlightLine:27,state:e(d),variables:[{name:"currentNode",value:d,highlight:!0},{name:"parentNode",value:c},{name:"len(visited)",value:n.size}]});for(let p of r[d]){if(p===c){i.push({explanation:`Neighbor ${p} == parentNode ${c} \u2192 skip it. This is just the undirected edge we arrived on, not a new path.`,highlightLine:33,state:e(d),variables:[{name:"neighbor",value:p},{name:"action",value:"skip (is parent)"}]});continue}let m=s(d,p);u[m]="active",i.push({explanation:`Neighbor ${p} \u2260 parentNode ${c} \u2192 recurse into dfs(${p}, ${d}).`,highlightLine:35,state:e(d),variables:[{name:"currentNode",value:d},{name:"recurse into",value:p,highlight:!0}]});let f=o(p,d);if(u[m]=f?"visited":"active",!f)return a--,t.pop(),!1;i.push({explanation:`Back at node ${d}: dfs(${p}) returned True (no cycle down that branch). Continue with ${d}'s remaining neighbors.`,highlightLine:35,state:e(d),variables:[{name:"back at",value:d,highlight:!0}]})}return a--,t.pop(),i.push({explanation:`Node ${d} fully explored \u2014 no cycle among its neighbors. Return True and pop it off the call stack (depth now ${a}).`,highlightLine:37,state:e(d),variables:[{name:"return",value:"True",highlight:!0},{name:"from node",value:d}]}),!0}let l=o(0,-1),h=l&&n.size===5;return i.push({explanation:h?`dfs(0, -1) returned True (no cycle) AND len(visited) = ${n.size} == n = 5 (every node was reached \u2192 connected). Both conditions hold \u2192 it IS a valid tree. Return True.`:`Result fails: no-cycle=${l}, len(visited)=${n.size} vs n=5. Not a valid tree.`,highlightLine:39,state:e(null,h),variables:[{name:"no cycle",value:String(l)},{name:"len(visited) == n",value:`${n.size} == 5 \u2192 ${n.size===5}`},{name:"result",value:String(h),highlight:!0}]}),i}function _r(){let i=[],u=new Array(5).fill("default"),r=new Array(Z.length).fill("default"),s=[0,1,2,3,4],n=[0,0,0,0,0],t=a=>({type:"graph",nodes:Nt.map((e,o)=>x(y({},e),{state:u[o]})),edges:Z.map(([e,o],l)=>({from:e,to:o,state:r[l]})),hashmapLabel:"parent",hashmap:Object.fromEntries(s.map((e,o)=>[String(o),e])),hashmap2Label:"rank",hashmap2:Object.fromEntries(n.map((e,o)=>[String(o),e])),stackItems:a?[a]:[]});return i.push({explanation:"A valid tree with n nodes must have exactly n\u22121 edges. len(edges)=4, n\u22121=4 \u2192 check passes, continue.",highlightLine:10,state:t(""),variables:[{name:"n",value:5},{name:"edges",value:"[[0,1],[0,2],[0,3],[1,4]]"},{name:"len(edges)",value:4},{name:"n \u2212 1",value:4}]}),i.push({explanation:"Initialize Union Find. parentMap[i]=i, rankMap[i]=0 \u2014 every node is its own root.",highlightLine:19,state:t(""),variables:[{name:"parent",value:"[0,1,2,3,4]"},{name:"rank",value:"[0,0,0,0,0]"}]}),u[0]="active",u[1]="active",r[0]="active",i.push({explanation:"Edge [0,1]: find(0)=0, find(1)=1. Different roots \u2192 no cycle, safe to union.",highlightLine:36,state:t("[0, 1]"),variables:[{name:"node1Root",value:0},{name:"node2Root",value:1}]}),s[1]=0,n[0]=1,u[0]="visited",u[1]="found",r[0]="visited",i.push({explanation:"Ranks equal \u2192 parentMap[1]=0, rankMap[0]\u21921. Node 1 is a child of root 0.",highlightLine:49,state:t("[0, 1]"),variables:[{name:"parent[1]",value:0,highlight:!0},{name:"rank[0]",value:1,highlight:!0}]}),u[2]="active",r[1]="active",i.push({explanation:"Edge [0,2]: find(0)=0, find(2)=2. Different roots \u2192 no cycle.",highlightLine:36,state:t("[0, 2]"),variables:[{name:"node1Root",value:0},{name:"node2Root",value:2}]}),s[2]=0,u[2]="found",r[1]="visited",i.push({explanation:"rank[0]=1 > rank[2]=0 \u2192 parentMap[2]=0. Component: {0,1,2} under root 0.",highlightLine:44,state:t("[0, 2]"),variables:[{name:"parent[2]",value:0,highlight:!0}]}),u[3]="active",r[2]="active",i.push({explanation:"Edge [0,3]: find(0)=0, find(3)=3. Different roots \u2192 no cycle.",highlightLine:36,state:t("[0, 3]"),variables:[{name:"node1Root",value:0},{name:"node2Root",value:3}]}),s[3]=0,u[3]="found",r[2]="visited",i.push({explanation:"rank[0]=1 > rank[3]=0 \u2192 parentMap[3]=0. Component: {0,1,2,3} under root 0.",highlightLine:44,state:t("[0, 3]"),variables:[{name:"parent[3]",value:0,highlight:!0}]}),u[1]="active",u[4]="active",r[3]="active",i.push({explanation:"Edge [1,4]: find(1) \u2192 parentMap[1]=0 \u2192 parentMap[0]=0, and it compresses the path. find(4)=4. Roots 0 vs 4 \u2192 no cycle.",highlightLine:30,state:t("[1, 4]"),variables:[{name:"node1Root",value:"0 (path compression)"},{name:"node2Root",value:4}]}),s[4]=0,u[1]="found",u[4]="found",r[3]="visited",i.push({explanation:"rank[0]=1 > rank[4]=0 \u2192 parentMap[4]=0. All 5 nodes share root 0.",highlightLine:44,state:t("[1, 4]"),variables:[{name:"parent[4]",value:0,highlight:!0}]}),i.push({explanation:"All edges processed with no union ever hitting the same root \u2014 no cycle. With exactly n\u22121 edges and no cycle, the graph is connected. Return True.",highlightLine:57,state:t(""),variables:[{name:"result",value:"True",highlight:!0}]}),i}var It={id:"graph-valid-tree",lcNumber:261,title:"Graph Valid Tree",difficulty:"Medium",category:"graphs",tags:["DFS","Union Find"],timeComplexity:"O(n + e)",spaceComplexity:"O(n + e)",description:"Given n nodes labeled 0 to n\u22121 and a list of undirected edges, determine if the edges form a valid tree (connected, no cycles).",examples:[{input:"n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]",output:"true",explanation:"All nodes connected, no cycles."},{input:"n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",output:"false",explanation:"len(edges)=5 \u2260 n\u22121=4 \u2014 cycle present."}],constraints:["1 \u2264 n \u2264 2000","0 \u2264 edges.length \u2264 5000","edges[i].length == 2","No duplicate edges","Edges are undirected"],hint:"A valid tree is connected with no cycles. DFS: walk from node 0 tracking the parent; revisiting a non-parent node means a cycle, and len(visited)==n proves connectivity. Union Find: exactly n\u22121 edges, and if any edge joins two nodes already in the same component there is a cycle.",solutions:[{label:"DFS",pythonCode:Dr,generateSteps:Hr},{label:"Union Find",pythonCode:Br,generateSteps:_r}]};var Wr=`def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
    # trees are connected and have no cycles
    # so we are trying to find an edge to remove that makes this graph a tree
    # if multiple are found, we found the latest in the list
    # we are basically just doing cycle finding and then remove last edge that causes the cycle
    # disjoint sets / union find to find cycles in a graph
    # since we know we started with a tree with n edges, we know we started with n - 1 nodes
    # we added one edge to make a cycle, so we know this problem has n edges and n nodes
    # union find: for all the nodes, we connect the nodes to the root parent
    # (union by rank and path compression) - Time complexity of O(\u03B1(n)), inverse Ackerman function
    # Union by Rank and Path Compression both aim to compress the linked list from naive union find
    # Union by Rank - pre-emptively attacks the linked list problem
    # Path Compression - reacts to the linked list problem after the fact

    numberOfNodes = len(edges)

    # node -> parent mapping
    # start by setting the current node's parent to itself
    # base case for union find before we go through each edge
    # the node is its own isolated component
    parentMap = {}
    rankMap = {}

    # 1 -> numberOfNodes + 1 since the problem starts with node 1 and not node 0
    for i in range(1,numberOfNodes+1):
        parentMap[i] = i

    # union by rank, start with a rank of 0 for everything
    # node -> rank mapping
    for i in range(1,numberOfNodes+1):
        rankMap[i] = 0

    # find the root of node
    def find(node):
        # if node is its own parent
        # we return parent node, this is base case of union find
        if node == parentMap[node]:
            return parentMap[node]
        # otherwise, we find the root of this node until we get to the starting root
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    # merges two nodes together
    # returns True for successful merge
    # returns False for bad merge, e.g. cycle found
    def union(node1, node2):
        node1Root = find(node1)
        node2Root = find(node2)
        if node1Root == node2Root:
            return False

        # if either ranks higher, we will compress by
        # setting the parent of the lower rank to the higher rank
        if rankMap[node1Root] < rankMap[node2Root]:
            parentMap[node1Root] = node2Root
        elif rankMap[node2Root] < rankMap[node1Root]:
            parentMap[node2Root] = node1Root
        else:
            # same level, we'll just preemptively set one higher rank
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        # if union was unsuccessful
        if not union(node1, node2):
            return [node1, node2]

    return []`;function zr(){let i=[[1,2],[1,3],[2,3]],u=[],r=[{id:1,x:200,y:65},{id:2,x:90,y:215},{id:3,x:310,y:215}],s=["default","default","default"],n=["default","default","default"],t={1:1,2:2,3:3},a={1:0,2:0,3:0},e=o=>({type:"graph",nodes:r.map((l,h)=>x(y({},l),{state:s[h]})),edges:i.map(([l,h],d)=>({from:l,to:h,state:n[d]})),hashmapLabel:"parentMap",hashmap:{1:t[1],2:t[2],3:t[3]},hashmap2Label:"rankMap",hashmap2:{1:a[1],2:a[2],3:a[3]},stackItems:o?[o]:[]});return u.push({explanation:"numberOfNodes=3. Initialize parentMap[i]=i (each node is its own root) and rankMap[i]=0. Nodes are 1-indexed, so we range from 1 to numberOfNodes.",highlightLine:25,state:e(""),variables:[{name:"numberOfNodes",value:3},{name:"parentMap",value:"{1:1, 2:2, 3:3}"},{name:"rankMap",value:"{1:0, 2:0, 3:0}"}]}),s[0]="active",s[1]="active",n[0]="active",u.push({explanation:"Edge [1,2]: find(1)=1, find(2)=2. Different roots \u2192 no cycle, safe to union.",highlightLine:47,state:e("[1, 2]"),variables:[{name:"node1Root",value:1},{name:"node2Root",value:2}]}),t[2]=1,a[1]=1,s[0]="visited",s[1]="found",n[0]="visited",u.push({explanation:"Ranks equal \u2192 else branch: parentMap[2]=1, rankMap[1]\u21921. Node 2 is now a child of root 1.",highlightLine:60,state:e("[1, 2]"),variables:[{name:"parentMap[2]",value:1,highlight:!0},{name:"rankMap[1]",value:1,highlight:!0}]}),s[2]="active",n[1]="active",u.push({explanation:"Edge [1,3]: find(1)=1, find(3)=3. Different roots \u2192 no cycle.",highlightLine:47,state:e("[1, 3]"),variables:[{name:"node1Root",value:1},{name:"node2Root",value:3}]}),t[3]=1,s[2]="found",n[1]="visited",u.push({explanation:"rankMap[3]=0 < rankMap[1]=1 \u2192 elif branch: parentMap[3]=1. All nodes {1,2,3} under root 1.",highlightLine:57,state:e("[1, 3]"),variables:[{name:"parentMap[3]",value:1,highlight:!0}]}),s[1]="active",s[2]="active",n[2]="active",u.push({explanation:"Edge [2,3]: find(2)\u2192parentMap[2]=1. find(3)\u2192parentMap[3]=1. Same root (1) \u2014 adding [2,3] would create a cycle.",highlightLine:49,state:e("[2, 3]"),variables:[{name:"find(2)",value:"1 (path compression)"},{name:"find(3)",value:"1 (path compression)"},{name:"node1Root === node2Root",value:"True",highlight:!0}]}),u.push({explanation:"union(2,3) returns False \u2014 same root means [2,3] closes a cycle. Return [2,3] as the redundant edge. O(n\xB7\u03B1(n)) time, O(n) space.",highlightLine:67,state:e("[2, 3]"),variables:[{name:"result",value:"[2, 3]",highlight:!0}]}),u}var qt={id:"redundant-connection",lcNumber:684,title:"Redundant Connection",difficulty:"Medium",category:"graphs",tags:["Union Find"],timeComplexity:"O(n \xB7 \u03B1(n))",spaceComplexity:"O(n)",description:"Given a graph that started as a tree with one extra edge added, find and return the redundant edge. If multiple answers exist, return the last one in the input.",examples:[{input:"edges = [[1,2],[1,3],[2,3]]",output:"[2,3]",explanation:"[2,3] is redundant \u2014 removing it leaves a valid tree."},{input:"edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]",output:"[1,4]",explanation:"[1,4] closes the cycle 1\u21922\u21923\u21924\u21921."}],constraints:["n == edges.length","3 \u2264 n \u2264 1000","edges[i].length == 2","1 \u2264 a\u1D62 < b\u1D62 \u2264 n","No repeated edges","Graph is connected"],hint:"Process edges one by one with Union Find. The first edge whose two endpoints share the same root creates the cycle \u2014 that's the redundant edge.",solutions:[{label:"Union Find",pythonCode:Wr,generateSteps:zr}]};var Yr=`class Solution:
    def kPalindromeMemo(self, s: str, k: int) -> bool:
        # we'll leverage the same idea we did for valid palindrome 2
        # we use left and right pointer like we would for valid palindrome 1
        # and then we keep a counter every time we skip an element
        # now issue becomes, what happens if we can skip on both sides
        # then doesn't this become a backtracking problem where we need to decide which side to skip?

        # store how many skips we have for (l,r, skips) -> skippable
        # memos should be snapshots, not tracking for our resources
        memo = {}

        def backtrack(l,r,skipsRemaining):
            currentState = (l,r,skipsRemaining)

            if currentState in memo:
                return memo[currentState]
            if skipsRemaining < 0:
                return False

            while l < r:
                if s[l] == s[r]:
                    l+=1
                    r-=1
                else:
                    # choose whether to go left or right
                    return backtrack(l+1, r, skipsRemaining-1) or backtrack(l,r-1,skipsRemaining-1)
            return True

        return backtrack(0,len(s)-1,k)`,Gr=`from functools import cache

class Solution:
    """
    What if instead of allowing one skip, we allow skip number of skips
    """
    def kPalindromeDP(self, s: str, k: int) -> bool:
        # we'll leverage the same idea we did for valid palindrome 2
        # we use left and right pointer like we would for valid palindrome 1
        # and then we keep a counter every time we skip an element
        # now issue becomes, what happens if we can skip on both sides
        # then doesn't this become a backtracking problem where we need to decide which side to skip?

        # we can use the built in 'memoization' or cache from python
        # this will automatically reduce our time complexity from O(n*2^k) to O(n*k)
        @cache
        def backtrack(l,r,skipsRemaining):
            if skipsRemaining < 0:
                return False

            while l < r:
                if s[l] == s[r]:
                    l+=1
                    r-=1
                else:
                    # choose whether to go left or right
                    return backtrack(l+1, r, skipsRemaining-1) or backtrack(l,r-1,skipsRemaining-1)
            return True

        return backtrack(0,len(s)-1,k)`,V=["a","b","c","d","e","c","a"];function Rt(i=11){let u=[],r="abcdeca",n=r.length,t=new Set,a=new Set;return u.push({explanation:`Valid Palindrome III: is s = "${r}" a 2-palindrome? A string is a k-palindrome if it can become a palindrome by removing at most k characters. Strategy: two-pointer backtracking with memoization. Use left (l) and right (r) pointers; when s[l] == s[r] advance both. When they differ, branch \u2014 try skipping l or skipping r (costs one removal each). Memo caches (l, r, skipsRemaining) states.`,highlightLine:i,state:{type:"array",cells:V.map(e=>({value:e,state:"default"})),pointers:[{index:0,label:"l"},{index:n-1,label:"r"}],counters:[{label:"k (skips left)",value:2},{label:"result",value:"?"}]},variables:[{name:"s",value:r},{name:"k",value:2},{name:"n",value:n}]}),u.push({explanation:"backtrack(l=0, r=6, skips=2): s[0]='a' == s[6]='a' \u2192 match! Advance both pointers: l=1, r=5. No removal used. Matched pair highlighted in green.",highlightLine:24,state:{type:"array",cells:V.map((e,o)=>({value:e,state:o===0||o===6?"found":"default"})),pointers:[{index:0,label:"l=0"},{index:6,label:"r=6"}],counters:[{label:"k (skips left)",value:2},{label:"result",value:"?"}]},variables:[{name:"l",value:0},{name:"r",value:6},{name:"s[l]",value:"a"},{name:"s[r]",value:"a"},{name:"match",value:"true"}]}),t.add(0),t.add(6),u.push({explanation:"backtrack(l=1, r=5, skips=2): s[1]='b' != s[5]='c' \u2192 mismatch. Must branch: try skipping left (backtrack(l=2, r=5, skips=1)) OR skipping right (backtrack(l=1, r=4, skips=1)). We explore skip-left first (short-circuit OR).",highlightLine:27,state:{type:"array",cells:V.map((e,o)=>({value:e,state:t.has(o)?"found":o===1||o===5?"active":"default"})),pointers:[{index:1,label:"l=1"},{index:5,label:"r=5"}],counters:[{label:"k (skips left)",value:2},{label:"result",value:"?"}]},variables:[{name:"l",value:1},{name:"r",value:5},{name:"s[l]",value:"b"},{name:"s[r]",value:"c"},{name:"mismatch \u2192 branch",value:"skip l or skip r"}]}),a.add(1),u.push({explanation:"Branch A: skip left \u2014 remove 'b' at index 1. backtrack(l=2, r=5, skips=1): s[2]='c' == s[5]='c' \u2192 match! Advance: l=3, r=4. Skips remaining: 1.",highlightLine:22,state:{type:"array",cells:V.map((e,o)=>({value:e,state:t.has(o)?"found":a.has(o)?"eliminated":o===2||o===5?"found":"default"})),pointers:[{index:2,label:"l=2"},{index:5,label:"r=5"}],counters:[{label:"k (skips left)",value:1},{label:"result",value:"?"}]},variables:[{name:"l",value:2},{name:"r",value:5},{name:"s[l]",value:"c"},{name:"s[r]",value:"c"},{name:"match",value:"true"}]}),t.add(2),t.add(5),u.push({explanation:"backtrack(l=3, r=4, skips=1): s[3]='d' != s[4]='e' \u2192 mismatch again. Branch: skip left (backtrack(l=4, r=4, skips=0)) or skip right (backtrack(l=3, r=3, skips=0)). Try skip-left first.",highlightLine:27,state:{type:"array",cells:V.map((e,o)=>({value:e,state:t.has(o)?"found":a.has(o)?"eliminated":o===3||o===4?"active":"default"})),pointers:[{index:3,label:"l=3"},{index:4,label:"r=4"}],counters:[{label:"k (skips left)",value:1},{label:"result",value:"?"}]},variables:[{name:"l",value:3},{name:"r",value:4},{name:"s[l]",value:"d"},{name:"s[r]",value:"e"},{name:"mismatch \u2192 branch",value:"skip l or skip r"}]}),a.add(3),u.push({explanation:"Skip left \u2014 remove 'd' at index 3. backtrack(l=4, r=4, skips=0): l >= r \u2192 palindrome condition met! Return true. Total removals used: 2 ('b' and 'd'). 2 \u2264 k=2 \u2192 valid k-palindrome.",highlightLine:28,state:{type:"array",cells:V.map((e,o)=>({value:e,state:t.has(o)?"found":a.has(o)?"eliminated":o===4?"found":"default"})),pointers:[{index:4,label:"l=r=4"}],counters:[{label:"k (skips left)",value:0},{label:"result",value:"true"}]},variables:[{name:"l",value:4},{name:"r",value:4},{name:"l >= r",value:"true \u2192 return true"}]}),t.add(4),u.push({explanation:`Final result: true. The string "${r}" can be made into a palindrome by removing at most 2 characters (e.g., remove 'b' and 'd' \u2192 "acdca" or remove 'b' and 'e' \u2192 "acdca"). The memoization (state = (l, r, skipsRemaining)) prevents re-computing the same sub-problems. Time: O(n\xB2\xB7k), Space: O(n\xB2\xB7k) with memo \u2014 but @cache reduces this from exponential O(n\xB72^k) to polynomial.`,highlightLine:30,state:{type:"array",cells:V.map((e,o)=>({value:e,state:a.has(o)?"eliminated":"found"})),pointers:[],counters:[{label:"k (skips left)",value:0},{label:"result",value:"true"}]},variables:[{name:"return",value:"true",highlight:!0}]}),u}function Vr(){return Rt(16)}var Ur={label:"Backtracking + Manual Memo",pythonCode:Yr,generateSteps:Rt},Xr={label:"Backtracking + @cache",pythonCode:Gr,generateSteps:Vr},Pt={id:"valid-palindrome-iii",lcNumber:1216,title:"Valid Palindrome III",difficulty:"Hard",category:"dynamic-programming",tags:["String","Dynamic Programming","Backtracking","Memoization"],timeComplexity:"O(n\xB2\xB7k)",spaceComplexity:"O(n\xB2\xB7k)",description:"Given a string s and an integer k, return true if s is a k-palindrome. A string is k-palindrome if it can be transformed into a palindrome by removing at most k characters from it.",examples:[{input:'s = "abcdeca", k = 2',output:"true",explanation:`Remove 'b' and 'e' (or 'b' and 'd') to get "acdca", which is a palindrome.`},{input:'s = "abcdeca", k = 1',output:"false",explanation:"At least 2 deletions are needed; 1 is not enough."}],constraints:["1 \u2264 s.length \u2264 1000","s consists of lowercase English letters only.","1 \u2264 k \u2264 s.length"],hint:"Use two-pointer backtracking: l and r start at opposite ends. When s[l] == s[r], advance both. When they differ, branch \u2014 try removing s[l] (call backtrack(l+1, r, k-1)) OR removing s[r] (call backtrack(l, r-1, k-1)). Memoize on (l, r, skipsRemaining) to cut exponential time to polynomial.",solutions:[Ur,Xr]};var Kr=`class Solution:
    def removeElementTwoPointer(self, nums: List[int], val: int) -> int:
        # use counter to keep track of where the replacement should go
        # iterate through the list
        # if nums[i] == val, counter stays here
        # if nums[i] != val, replace nums[counter] = nums[i], increment counter

        counter = 0
        for value in enumerate(nums):
            if value != val:
                nums[counter] = value
                counter+=1

        return counter`;function Qr(){let i=[0,1,2,2,3,0,4,2],u=2,r=[...i],s=[];s.push({explanation:`Remove Element on nums=[${i.join(",")}], val=${u}. Two-pointer approach: k is the write position. Walk i through the array; when nums[i] != val, write it to nums[k] and increment k. Elements at k and beyond after the loop are "don't care".`,highlightLine:9,state:{type:"array",cells:r.map(t=>({value:t,state:"default"})),pointers:[{index:0,label:"k=0"},{index:0,label:"i=0"}],counters:[{label:"k (write ptr)",value:0},{label:"i (read ptr)",value:0},{label:"val",value:u}]},variables:[{name:"nums",value:`[${i.join(",")}]`},{name:"val",value:u},{name:"k",value:0}]});let n=0;for(let t=0;t<r.length;t++){let a=r[t],e=a===u;s.push({explanation:`i=${t}: nums[i]=${a}. ${e?`Equal to val=${u} \u2192 skip (k stays at ${n}).`:`Not val \u2192 write nums[${n}] = ${a}, increment k to ${n+1}.`}`,highlightLine:e?11:12,state:{type:"array",cells:r.map((o,l)=>({value:o,state:l===t?"active":l<n?"found":"default"})),pointers:[{index:n,label:"k"},{index:t,label:"i"}],counters:[{label:"k (write ptr)",value:n},{label:"i (read ptr)",value:t},{label:"nums[i]",value:a},{label:"is val?",value:e?"yes\u2192skip":"no\u2192write"}]},variables:[{name:"i",value:t},{name:"nums[i]",value:a,highlight:!0},{name:"k",value:n}]}),e?s.push({explanation:`nums[${t}]=${a} equals val=${u} \u2192 eliminated (skip). k stays at ${n}.`,highlightLine:11,state:{type:"array",cells:r.map((o,l)=>({value:o,state:l===t?"eliminated":l<n?"found":"default"})),pointers:[{index:n<r.length?n:r.length-1,label:"k"},{index:t,label:"i"}],counters:[{label:"k (write ptr)",value:n},{label:"i (read ptr)",value:t},{label:"skipped val",value:a}]},variables:[{name:"k",value:n},{name:"skipped",value:a,highlight:!0}]}):(r[n]=a,n++,s.push({explanation:`Wrote ${a} to position ${n-1}. k is now ${n}. First ${n} element(s) in result: [${r.slice(0,n).join(",")}].`,highlightLine:12,state:{type:"array",cells:r.map((o,l)=>({value:o,state:l<n?"found":l===t?"visited":"default"})),pointers:[{index:n<r.length?n:r.length-1,label:"k"},{index:t,label:"i"}],counters:[{label:"k (write ptr)",value:n},{label:"i (read ptr)",value:t},{label:"result so far",value:`[${r.slice(0,n).join(",")}]`}]},variables:[{name:"k",value:n,highlight:!0},{name:"result",value:`[${r.slice(0,n).join(",")}]`}]}))}return s.push({explanation:`Done. k=${n} elements remain. Result (first ${n} elements): [${r.slice(0,n).join(",")}]. The remaining cells are "don't care". Return k=${n}.`,highlightLine:14,state:{type:"array",cells:r.map((t,a)=>({value:t,state:a<n?"found":"eliminated"})),pointers:[],counters:[{label:"k (return)",value:n},{label:"result",value:`[${r.slice(0,n).join(",")}]`}]},variables:[{name:"return k",value:n,highlight:!0}]}),s}var Jr={label:"Two Pointer (Write Position)",pythonCode:Kr,generateSteps:Qr},At={id:"remove-element",lcNumber:27,title:"Remove Element",difficulty:"Easy",category:"arrays-hash",tags:["Array","Two Pointers"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array nums and an integer val, remove all occurrences of val in nums in-place. Return the number of elements k in nums which are not equal to val. The first k elements of nums must contain only non-val elements.",examples:[{input:"nums = [3,2,2,3], val = 3",output:"2, nums = [2,2,_,_]",explanation:"Return k=2 with the first two elements being 2."},{input:"nums = [0,1,2,2,3,0,4,2], val = 2",output:"5, nums = [0,1,4,0,3,_,_,_]",explanation:"Return k=5; the first five elements contain the non-2 values in any order."}],constraints:["0 \u2264 nums.length \u2264 100","0 \u2264 nums[i] \u2264 50","0 \u2264 val \u2264 100"],hint:"Use a write pointer k starting at 0. Walk i through the array: whenever nums[i] != val, copy nums[i] to nums[k] and advance k. At the end, the first k elements are the valid result. O(n) time, O(1) space.",solutions:[Jr]};var Zr=`class Solution:
    def getConcatenationNonPython(self, nums: List[int]) -> List[int]:
        # create a list of size len(nums)*2
        # loop through new list, insert nums
        ans = []
        ansIterator = 0
        while ansIterator < len(nums)*2:
            ans.append(nums[ansIterator%len(nums)])
            ansIterator+=1
        return ans`;function el(){let i=[1,2,1],u=i.length,r=[],s=new Array(u*2).fill(0);r.push({explanation:`Concatenation of Array: nums=[${i.join(",")}]. Create ans of size ${u*2} (all 0). Fill ans[i] = nums[i] for i in [0..${u-1}], then ans[i+n] = nums[i] for i in [0..${u-1}]. Result will be [${[...i,...i].join(",")}].`,highlightLine:5,state:{type:"array",cells:s.map(n=>({value:n,state:"default"})),pointers:[{index:0,label:"ansIterator=0"}],counters:[{label:"n",value:u},{label:"ans.length",value:u*2}]},variables:[{name:"nums",value:`[${i.join(",")}]`},{name:"n",value:u}]});for(let n=0;n<u;n++)s[n]=i[n],r.push({explanation:`ansIterator=${n}: ans[${n}] = nums[${n} % ${u}] = nums[${n}] = ${i[n]}. First copy pass.`,highlightLine:8,state:{type:"array",cells:s.map((t,a)=>({value:t,state:a===n?"active":a<n?"found":"default"})),pointers:[{index:n,label:`ans[${n}]`}],counters:[{label:"ansIterator",value:n},{label:"src: nums[i%n]",value:i[n%u]},{label:"filled",value:`[${s.slice(0,n+1).join(",")}]`}]},variables:[{name:"ansIterator",value:n},{name:"nums[i%n]",value:i[n%u],highlight:!0}]});for(let n=0;n<u;n++)s[u+n]=i[n],r.push({explanation:`ansIterator=${u+n}: ans[${u+n}] = nums[${u+n} % ${u}] = nums[${n}] = ${i[n]}. Second copy pass (repeat).`,highlightLine:8,state:{type:"array",cells:s.map((t,a)=>({value:t,state:a===u+n?"active":a<=u+n-1?"found":"default"})),pointers:[{index:u+n,label:`ans[${u+n}]`}],counters:[{label:"ansIterator",value:u+n},{label:"src: nums[i%n]",value:i[n]},{label:"filled",value:`[${s.slice(0,u+n+1).join(",")}]`}]},variables:[{name:"ansIterator",value:u+n},{name:"nums[i%n]",value:i[n],highlight:!0}]});return r.push({explanation:`All ${u*2} cells written. ans = [${s.join(",")}]. The array is exactly nums+nums. Return ans.`,highlightLine:10,state:{type:"array",cells:s.map(n=>({value:n,state:"found"})),pointers:[],counters:[{label:"return",value:`[${s.join(",")}]`}]},variables:[{name:"return",value:`[${s.join(",")}]`,highlight:!0}]}),r}var tl={label:"Index Modulo Fill",pythonCode:Zr,generateSteps:el},jt={id:"concatenation-of-array",lcNumber:1929,title:"Concatenation of Array",difficulty:"Easy",category:"arrays-hash",tags:["Array"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an integer array nums of length n, create an array ans of length 2n where ans[i] == nums[i] and ans[i+n] == nums[i] for 0 \u2264 i < n. Return the array ans.",examples:[{input:"nums = [1,2,1]",output:"[1,2,1,1,2,1]",explanation:"ans = [nums[0],nums[1],nums[2],nums[0],nums[1],nums[2]] = [1,2,1,1,2,1]."},{input:"nums = [1,3,2,1]",output:"[1,3,2,1,1,3,2,1]"}],constraints:["n == nums.length","1 \u2264 n \u2264 1000","1 \u2264 nums[i] \u2264 1000"],hint:"Create ans of size 2n. For ansIterator from 0 to 2n-1, set ans[ansIterator] = nums[ansIterator % n]. The modulo wraps back to the start of nums after the first n elements.",solutions:[tl]};var al=`class Solution:
    def mergeAlternately(self, word1: str, word2: str) -> str:
        result = ""
        p1 = p2 = 0
        while p1 < len(word1) and p2 < len(word2):
            result += word1[p1]
            result += word2[p2]
            p1+=1
            p2+=1
        result += word1[p1:]
        result += word2[p2:]
        return result`;function nl(){let r=[],s="",n=0,t=0,a=(e,o)=>[..."ace".split("").map((l,h)=>({value:l,state:h===e?"active":h<n?"visited":"default"})),{value:"|",state:"default"},..."bd".split("").map((l,h)=>({value:l,state:h===o?"active":h<t?"visited":"default"}))];for(r.push({explanation:'Merge Strings Alternately: word1="ace", word2="bd". Use two pointers p1 and p2. Each iteration take word1[p1] then word2[p2] and append to result. When one string is exhausted, append the remaining of the other.',highlightLine:3,state:{type:"array",cells:a(null,null),pointers:[{index:0,label:"p1"},{index:4,label:"p2"}],counters:[{label:"p1",value:n},{label:"p2",value:t},{label:"result",value:'""'}]},variables:[{name:"word1",value:"ace"},{name:"word2",value:"bd"},{name:"result",value:'""'}]});n<3&&t<2;){let e="ace"[n],o="bd"[t];r.push({explanation:`p1=${n}, p2=${t}: take word1[${n}]='${e}', append to result. result="${s}${e}".`,highlightLine:5,state:{type:"array",cells:a(n,null),pointers:[{index:n,label:"p1"},{index:4+t,label:"p2"}],counters:[{label:"p1",value:n},{label:"p2",value:t},{label:"result",value:`"${s}${e}"`}]},variables:[{name:"p1",value:n},{name:"word1[p1]",value:e,highlight:!0},{name:"result",value:`"${s}${e}"`}]}),s+=e,r.push({explanation:`p1=${n}, p2=${t}: take word2[${t}]='${o}', append to result. result="${s}${o}".`,highlightLine:6,state:{type:"array",cells:a(null,t),pointers:[{index:n,label:"p1"},{index:4+t,label:"p2"}],counters:[{label:"p1",value:n},{label:"p2",value:t},{label:"result",value:`"${s}${o}"`}]},variables:[{name:"p2",value:t},{name:"word2[p2]",value:o,highlight:!0},{name:"result",value:`"${s}${o}"`}]}),s+=o,n++,t++}if(n<3){let e="ace".slice(n);r.push({explanation:`word2 exhausted (p2=${t}). Append remaining word1[${n}:]="${e}" to result. result="${s}${e}".`,highlightLine:9,state:{type:"array",cells:a(null,null),pointers:[{index:n,label:"p1 (rem)"},{index:4+t,label:"p2 (end)"}],counters:[{label:"p1",value:n},{label:"remainder",value:`"${e}"`},{label:"result",value:`"${s}${e}"`}]},variables:[{name:"remainder word1",value:e,highlight:!0},{name:"result",value:`"${s}${e}"`}]}),s+=e,n=3}if(t<2){let e="bd".slice(t);r.push({explanation:`word1 exhausted (p1=${n}). Append remaining word2[${t}:]="${e}" to result. result="${s}${e}".`,highlightLine:10,state:{type:"array",cells:a(null,null),pointers:[{index:n<3?n:2,label:"p1 (end)"},{index:4+t,label:"p2 (rem)"}],counters:[{label:"p2",value:t},{label:"remainder",value:`"${e}"`},{label:"result",value:`"${s}${e}"`}]},variables:[{name:"remainder word2",value:e,highlight:!0},{name:"result",value:`"${s}${e}"`}]}),s+=e}return r.push({explanation:`Done. Merged result="${s}". All characters from both words interleaved, with the longer word's tail appended. Return "${s}".`,highlightLine:11,state:{type:"array",cells:[..."ace".split("").map(e=>({value:e,state:"visited"})),{value:"|",state:"default"},..."bd".split("").map(e=>({value:e,state:"visited"}))],pointers:[],counters:[{label:"return result",value:`"${s}"`}]},variables:[{name:"return",value:s,highlight:!0}]}),r}var il={label:"Two Pointer Alternating Merge",pythonCode:al,generateSteps:nl},Et={id:"merge-strings-alternatively",lcNumber:1768,title:"Merge Strings Alternately",difficulty:"Easy",category:"two-pointers",tags:["Two Pointers","String"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given two strings word1 and word2, merge them by adding letters in alternating order starting with word1. If one string is longer, append its remaining letters to the end of the merged string.",examples:[{input:'word1 = "abc", word2 = "pqr"',output:'"apbqcr"',explanation:"Merge alternately: a,p,b,q,c,r."},{input:'word1 = "ab", word2 = "pqrs"',output:'"apbqrs"',explanation:'word2 is longer; "rs" is appended after interleaving.'},{input:'word1 = "abcd", word2 = "pq"',output:'"apbqcd"',explanation:'word1 is longer; "cd" is appended after interleaving.'}],constraints:["1 \u2264 word1.length, word2.length \u2264 100","word1 and word2 consist of lowercase English letters."],hint:"Use two pointers p1 and p2. While both are in bounds, append word1[p1] then word2[p2] and advance both. After the loop, append the remaining tail of whichever string is longer.",solutions:[il]};var sl=`class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # greedy: collect every upward move
        # if prices[i] > prices[i-1], that is a profitable day
        # add prices[i] - prices[i-1] to profit
        profit = 0
        for i in range(1, len(prices)):
            if prices[i] > prices[i-1]:
                profit += prices[i] - prices[i-1]
        return profit`;function rl(){let i=[7,1,5,3,6,4],u=[],r=0;u.push({explanation:`Best Time to Buy and Sell Stock II: prices=[${i.join(",")}]. Greedy approach: every time prices[i] > prices[i-1], add that gain to profit (equivalent to buying at every local min, selling at every local max). Sum all positive day-over-day differences.`,highlightLine:5,state:{type:"array",cells:i.map(s=>({value:s,state:"default"})),pointers:[],counters:[{label:"profit",value:0},{label:"i",value:1}]},variables:[{name:"prices",value:`[${i.join(",")}]`},{name:"profit",value:0}]});for(let s=1;s<i.length;s++){let n=i[s]-i[s-1],t=n>0;u.push({explanation:`i=${s}: prices[${s}]=${i[s]}, prices[${s-1}]=${i[s-1]}. Gain = ${i[s]} - ${i[s-1]} = ${n}. ${t?`Profitable! Add ${n} \u2192 profit = ${r} + ${n} = ${r+n}.`:"Not profitable (gain \u2264 0), skip."}`,highlightLine:t?8:7,state:{type:"array",cells:i.map((a,e)=>({value:a,state:e===s?t?"found":"eliminated":e===s-1?"active":e<s-1?"visited":"default"})),pointers:[{index:s,label:`i=${s}`}],counters:[{label:"i",value:s},{label:"gain",value:n},{label:"profit",value:t?r+n:r}]},variables:[{name:"i",value:s},{name:`prices[${s}]-prices[${s-1}]`,value:n,highlight:!0},{name:"profit",value:t?r+n:r,highlight:t}]}),t&&(r+=n)}return u.push({explanation:`All days processed. Total profit = ${r}. Profitable days (green) contributed gains; unprofitable days (red) were skipped. Return ${r}.`,highlightLine:9,state:{type:"array",cells:i.map((s,n)=>({value:s,state:n===0?"visited":i[n]-i[n-1]>0?"found":"eliminated"})),pointers:[],counters:[{label:"return profit",value:r}]},variables:[{name:"return profit",value:r,highlight:!0}]}),u}var ll={label:"Greedy (Collect Every Upward Move)",pythonCode:sl,generateSteps:rl},Ft={id:"best-time-buy-sell-stock-ii",lcNumber:122,title:"Best Time to Buy and Sell Stock II",difficulty:"Medium",category:"arrays-hash",tags:["Array","Greedy"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given an integer array prices where prices[i] is the price of a stock on day i, find the maximum profit you can achieve. You may buy and sell the stock multiple times (but must sell before buying again).",examples:[{input:"prices = [7,1,5,3,6,4]",output:"7",explanation:"Buy on day 2 (price=1), sell day 3 (price=5), profit=4. Buy day 4 (price=3), sell day 5 (price=6), profit=3. Total=7."},{input:"prices = [1,2,3,4,5]",output:"4",explanation:"Buy day 1 (price=1), sell day 5 (price=5), profit=4."},{input:"prices = [7,6,4,3,1]",output:"0",explanation:"Prices are always decreasing; no profitable transaction is possible."}],constraints:["1 \u2264 prices.length \u2264 3 \xD7 10\u2074","0 \u2264 prices[i] \u2264 10\u2074"],hint:"Greedy: for each day i from 1 to n-1, if prices[i] > prices[i-1], add the difference to profit. This is equivalent to buying at every valley and selling at every peak, capturing every upward move.",solutions:[ll]};var ol=`class Solution:
    def shipWithinDays(self, weights: List[int], days: int) -> int:
        # ordering matters, so can't sort
        # seems like what we are doing is getting the min boundary for each day
        # so sum(weights)/days is at minimum the capacity we need if we can split up the weights, which we cannot
        # then sum(weights) is a guarantee that we can ship all in one day
        # so what we can do is binary search min boundary with those two
        # so above thought for minimum capacity is wrong, since we will never be able to ship some packages
        # e.g. [1,1,1,1,10], days = 5
        # sum(weights)//days = 2, which means we will never be able to ship out the 10
        # the minimum boundary of sum(weights)//days is unfortunately just logically impossible
        # thus we don't start with it

        def canShip(dailyCapacity):
            daysNeeded = 1
            currentLoad = 0

            for weight in weights:
                if currentLoad + weight > dailyCapacity:
                    daysNeeded+=1
                    currentLoad=0
                currentLoad+=weight
            return daysNeeded <= days

        l = max(weights)
        r = sum(weights)

        while l < r:
            mid = (l + r) // 2
            # criteria is that we are able to ship
            # so let's find the smallest possible to ship
            if canShip(mid):
                r=mid
            else:
                l=mid+1
        return l`;function Dt(i,u,r){let s=1,n=0,t=new Array(i.length).fill(0),a=0;for(let e=0;e<i.length;e++)n+i[e]>u&&(s++,n=0,a++),n+=i[e],t[e]=a+1;return{daysNeeded:s,shipDays:t}}function ul(){let i=[1,2,3,4,5,6,7,8,9,10],u=5,r=[],s=Math.max(...i),n=i.reduce((o,l)=>o+l,0);r.push({explanation:`Capacity to Ship Packages: weights=[${i.join(",")}], days=${u}. Binary search on capacity in [max(weights)..sum(weights)] = [${s}..${n}]. max(weights)=${s} is the minimum possible (must fit the heaviest package). sum(weights)=${n} ships everything in 1 day. For each mid capacity, simulate greedy packing and count days needed.`,highlightLine:25,state:{type:"array",cells:i.map(o=>({value:o,state:"default"})),pointers:[],counters:[{label:"l (min cap)",value:s},{label:"r (max cap)",value:n},{label:"target days",value:u}]},variables:[{name:"weights",value:`[${i.join(",")}]`},{name:"l",value:s},{name:"r",value:n},{name:"days",value:u}]});let t=s,a=n;for(r.push({explanation:`Initialize l=${t}=max(weights), r=${a}=sum(weights). Use l < r to converge on the minimum feasible capacity. Note: we can't use sum/days as the lower bound because individual packages can't be split.`,highlightLine:25,state:{type:"array",cells:i.map(o=>({value:o,state:"default"})),pointers:[],counters:[{label:"l",value:t},{label:"r",value:a},{label:"target days",value:u}]},variables:[{name:"l",value:t},{name:"r",value:a}]});t<a;){let o=Math.floor((t+a)/2),{daysNeeded:l,shipDays:h}=Dt(i,o,u),d=l<=u;r.push({explanation:`l=${t}, r=${a}, mid=${o} (capacity=${o}). Simulate greedy packing: greedily load packages until adding the next would exceed ${o}. Days needed = ${l}. ${d?`${l} \u2264 ${u} \u2192 feasible, try smaller: r = ${o}.`:`${l} > ${u} \u2192 too small, try larger: l = ${o+1}.`}`,highlightLine:d?31:33,state:{type:"array",cells:i.map((c,p)=>({value:c,state:d?"window":"eliminated"})),pointers:[],counters:[{label:"mid (capacity)",value:o},{label:"days_needed",value:l},{label:"target_days",value:u},{label:"l",value:t},{label:"r",value:a},{label:d?"r \u2192":"l \u2192",value:d?o:o+1}]},variables:[{name:"mid",value:o},{name:"days_needed",value:l},{name:"feasible?",value:d?"YES \u2192 r=mid":"NO \u2192 l=mid+1",highlight:!0}]}),r.push({explanation:`Packing detail at capacity=${o}: packages coloured by ship day. Day 1 (window) \u2192 Day ${l}. Package sizes: ${i.map((c,p)=>`[${p}]:${c}\u2192day${h[p]}`).join(", ")}.`,highlightLine:d?31:33,state:{type:"array",cells:i.map((c,p)=>({value:c,state:h[p]%2===1?"window":"visited"})),pointers:[],counters:[{label:"capacity",value:o},{label:"days_needed",value:l},{label:"target_days",value:u},{label:"feasible?",value:d?"YES":"NO"}]},variables:[{name:"ship day dist",value:`[${h.join(",")}]`},{name:"days_needed",value:l}]}),d?a=o:t=o+1}let{daysNeeded:e}=Dt(i,t,u);return r.push({explanation:`l === r === ${t}. Converged! Minimum ship capacity = ${t}. Verification: at capacity=${t}, need ${e} days \u2264 ${u} \u2713. O(n log m) time where n=weights.length and m=sum(weights)-max(weights). O(1) space.`,highlightLine:34,state:{type:"array",cells:i.map(o=>({value:o,state:"found"})),pointers:[],counters:[{label:"answer capacity",value:t},{label:"days_needed",value:e},{label:"target_days",value:u}]},variables:[{name:"return capacity",value:t,highlight:!0}]}),r}var hl={label:"Binary Search on Capacity",pythonCode:ol,generateSteps:ul},Bt={id:"capacity-to-ship-packages",lcNumber:1011,title:"Capacity To Ship Packages Within D Days",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search"],timeComplexity:"O(n log m)",spaceComplexity:"O(1)",description:"A conveyor belt has packages to ship within days days. The i-th package weighs weights[i]. Each day load packages in order without exceeding the ship capacity. Return the least weight capacity to ship all packages within days days.",examples:[{input:"weights = [1,2,3,4,5,6,7,8,9,10], days = 5",output:"15",explanation:"Capacity 15: day1=[1,2,3,4,5], day2=[6,7], day3=[8], day4=[9], day5=[10]."},{input:"weights = [3,2,2,4,1,4], days = 3",output:"6"},{input:"weights = [1,2,3,1,1], days = 4",output:"3"}],constraints:["1 \u2264 days \u2264 weights.length \u2264 5 \xD7 10\u2074","1 \u2264 weights[i] \u2264 500"],hint:"Binary search on the capacity in [max(weights)..sum(weights)]. For each candidate capacity mid, greedily simulate: accumulate weights into the current day; when adding the next package exceeds mid, start a new day. If days_needed \u2264 days the capacity is feasible (try smaller, r=mid); otherwise too small (l=mid+1).",solutions:[hl]};var dl=`from collections import defaultdict
from typing import List

class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        # 3 validations
        # 1. check row
        # 2. check column
        # 3. check 3x3
        # #1 and #2 can be solved by a set + double for loop
        # #3 we need to use (i/3, j/3) as key and a set as value where we then do a double for loop

        for row in range(9):
            columnSet = set()
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in columnSet:
                    return False
                else:
                    columnSet.add(board[row][column])

        for column in range(9):
            rowSet = set()
            for row in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in rowSet:
                    return False
                else:
                    rowSet.add(board[row][column])

        seenMap = defaultdict(set)

        for row in range(9):
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in seenMap[(row//3), (column//3)]:
                    return False
                else:
                    seenMap[(row//3), (column//3)].add(board[row][column])

        return True`,cl=`from collections import defaultdict
from typing import List

class Solution:
    def isValidSudokuSingleLoop(self, board: List[List[str]]) -> bool:
        # Can do this in single loop by using 3 maps
        # each map keeping track of one criteria we are checking for
        rowMap = defaultdict(set)
        columnMap = defaultdict(set)
        squareMap = defaultdict(set)
        for row in range(9):
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                if ( board[row][column] in rowMap[row]
                    or board[row][column] in columnMap[column]
                    or board[row][column] in squareMap[(row//3),(column//3)]
                    ):
                    return False
                else:
                    rowMap[row].add(board[row][column])
                    columnMap[column].add(board[row][column])
                    squareMap[(row//3),(column//3)].add(board[row][column])
        return True`,le=[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]];function A(){return le.map(i=>i.map(u=>({state:u==="."?"empty":"land",label:u==="."?"":u})))}function pe(i){return i.map(u=>u.map(r=>y({},r)))}function pl(){let i=[];i.push({explanation:'Given a 9x9 Sudoku board (partially filled). We validate three rules: (1) each row has no duplicate digits, (2) each column has no duplicate digits, (3) each 3x3 sub-box has no duplicate digits. Empty cells "." are wildcards and are skipped. We run three separate passes.',highlightLine:5,state:{type:"grid",grid:A(),counters:[{label:"check",value:"initializing"},{label:"result",value:"pending"}]}});let u=A();for(let s=0;s<9;s++){let n=new Set,t=!1,a=pe(u);for(let e=0;e<s;e++)for(let o=0;o<9;o++)a[e][o].state!=="empty"&&(a[e][o].state="visited");i.push({explanation:`Row check \u2014 scanning row ${s}. Using a set to detect duplicate digits. Empty cells "." are skipped (wildcard). If we see the same digit twice in this row, the board is invalid.`,highlightLine:14,state:{type:"grid",grid:a,counters:[{label:"check",value:`row ${s}`},{label:"seen set",value:"{}"},{label:"result",value:"valid so far"}]}});for(let e=0;e<9;e++){let o=le[s][e],l=pe(a);if(l[s][e].state="queued",o===".")i.push({explanation:`Row ${s}, col ${e}: value is "." \u2014 wildcard, skip.`,highlightLine:17,state:{type:"grid",grid:l,counters:[{label:"check",value:`row ${s}, col ${e}`},{label:"cell",value:"."},{label:"action",value:"skip"}]}});else if(n.has(o)){l[s][e].state="rotten",t=!0,i.push({explanation:`Row ${s}, col ${e}: value "${o}" already in seen set! Duplicate found \u2014 board is INVALID. Return false.`,highlightLine:19,state:{type:"grid",grid:l,counters:[{label:"check",value:`row ${s}, col ${e}`},{label:"cell",value:o},{label:"result",value:"INVALID \u2014 duplicate in row"}]}});break}else n.add(o),a[s][e].state="visited",i.push({explanation:`Row ${s}, col ${e}: value "${o}" is new \u2014 add to seen set. seen=${JSON.stringify([...n])}.`,highlightLine:21,state:{type:"grid",grid:l,counters:[{label:"check",value:`row ${s}, col ${e}`},{label:"cell",value:o},{label:"seen set",value:JSON.stringify([...n])}]}})}if(t)break;for(let e=0;e<9;e++)u[s][e].state!=="empty"&&(u[s][e].state="visited")}i.push({explanation:"All 9 rows checked \u2014 no duplicate digits found in any row. Phase 1 (row validation) passed. Moving on to Phase 2: column checks.",highlightLine:23,state:{type:"grid",grid:(()=>{let s=A();return s.forEach(n=>n.forEach(t=>{t.state==="land"&&(t.state="visited")})),s})(),counters:[{label:"rows checked",value:"9 / 9"},{label:"result",value:"VALID"}]}});let r=A();r.forEach(s=>s.forEach(n=>{n.state==="land"&&(n.state="visited")}));for(let s of[0,4,8]){let n=new Set,t=pe(r);i.push({explanation:`Column check \u2014 scanning column ${s}. A fresh set tracks digits seen so far in this column. Duplicates \u2192 return false.`,highlightLine:26,state:{type:"grid",grid:t,counters:[{label:"check",value:`column ${s}`},{label:"seen set",value:"{}"},{label:"result",value:"valid so far"}]}});for(let a=0;a<9;a++){let e=le[a][s],o=pe(t);o[a][s].state="queued",e!=="."&&(n.add(e),i.push({explanation:`Col ${s}, row ${a}: "${e}" \u2014 added to seen. seen=${JSON.stringify([...n])}.`,highlightLine:e==="."?28:33,state:{type:"grid",grid:o,counters:[{label:"check",value:`col ${s}, row ${a}`},{label:"cell",value:e},{label:"seen set",value:JSON.stringify([...n])}]}}),t[a][s].state="visited")}}i.push({explanation:"All 9 columns checked \u2014 no duplicate digits in any column. Phase 2 (column validation) passed. Moving on to Phase 3: 3x3 box checks.",highlightLine:35,state:{type:"grid",grid:(()=>{let s=A();return s.forEach(n=>n.forEach(t=>{t.state==="land"&&(t.state="visited")})),s})(),counters:[{label:"cols checked",value:"9 / 9"},{label:"result",value:"VALID"}]}});for(let[s,n]of[[0,0],[1,1],[2,2]]){let t=new Set,a=A();a.forEach(e=>e.forEach(o=>{o.state==="land"&&(o.state="visited")}));for(let e=s*3;e<s*3+3;e++)for(let o=n*3;o<n*3+3;o++){let l=le[e][o];l!=="."&&(t.add(l),a[e][o].state="queued")}i.push({explanation:`3x3 box check \u2014 box (${s},${n}) covers rows [${s*3}..${s*3+2}], cols [${n*3}..${n*3+2}]. Key is (row//3, col//3) = (${s},${n}). Digits in this box: ${JSON.stringify([...t])}. No duplicates found.`,highlightLine:41,state:{type:"grid",grid:a,counters:[{label:"check",value:`box (${s},${n})`},{label:"digits seen",value:JSON.stringify([...t])},{label:"result",value:"valid"}]}})}return i.push({explanation:"All three phases complete \u2014 rows, columns, and 3x3 boxes all contain no duplicates. The board is VALID. Return true. Time O(1) (fixed 9x9 board), Space O(1) (fixed-size sets).",highlightLine:44,state:{type:"grid",grid:(()=>{let s=A();return s.forEach(n=>n.forEach(t=>{t.state==="land"&&(t.state="visited")})),s})(),counters:[{label:"rows",value:"VALID"},{label:"columns",value:"VALID"},{label:"boxes",value:"VALID"},{label:"result",value:"true"}]}}),i}function ml(){let i=[];i.push({explanation:"Optimized single-pass approach: use 3 defaultdict(set) maps \u2014 rowMap[row], columnMap[col], squareMap[(row//3, col//3)]. In one double for-loop, check all 3 constraints simultaneously for each filled cell. This avoids 3 separate passes.",highlightLine:5,state:{type:"grid",grid:A(),counters:[{label:"rowMap",value:"{}"},{label:"columnMap",value:"{}"},{label:"squareMap",value:"{}"}]}});let u={},r={},s={};for(let a=0;a<9;a++)u[a]=new Set,r[a]=new Set;for(let a=0;a<3;a++)for(let e=0;e<3;e++)s[`${a},${e}`]=new Set;let n=[],t=!1;for(let a=0;a<9&&!t;a++)for(let e=0;e<9&&!t;e++){let o=le[a][e],l=A();for(let[h,d]of n)l[h][d].state==="land"&&(l[h][d].state="visited");if(l[a][e].state="queued",o===".")i.push({explanation:`Cell (row ${a}, col ${e}) = "." \u2014 an empty cell, the "continue" branch. Sudoku rules only constrain filled cells, so skip it and move on. All three maps unchanged.`,highlightLine:13,state:{type:"grid",grid:l,counters:[{label:"cell",value:`(${a},${e})`},{label:"value",value:"."},{label:"action",value:"skip (continue)"}]}});else{let h=`${Math.floor(a/3)},${Math.floor(e/3)}`,d=u[a].has(o),c=r[e].has(o),p=s[h].has(o);if(d||c||p){l[a][e].state="rotten";let f=d?`row ${a}`:c?`column ${e}`:`box (${h})`;i.push({explanation:`Cell (${a}, ${e}) = "${o}": "${o}" is ALREADY in ${f}. That's a duplicate \u2192 the board is invalid, return False immediately.`,highlightLine:17,state:{type:"grid",grid:l,counters:[{label:"cell",value:`(${a},${e}) = "${o}"`},{label:"duplicate in",value:f},{label:"result",value:"false"}]}}),t=!0}else u[a].add(o),r[e].add(o),s[h].add(o),n.push([a,e]),i.push({explanation:`Cell (${a}, ${e}) = "${o}": check rowMap[${a}], columnMap[${e}], and squareMap[(${h})] all at once. "${o}" is in none of them \u2014 valid so far, so add it to all three. One pass enforces all three rules together.`,highlightLine:17,state:{type:"grid",grid:l,counters:[{label:"cell",value:`(${a},${e}) = "${o}"`},{label:`rowMap[${a}]`,value:JSON.stringify([...u[a]])},{label:`colMap[${e}]`,value:JSON.stringify([...r[e]])},{label:`boxMap[(${h})]`,value:JSON.stringify([...s[h]])}]}})}}return t||i.push({explanation:"Single-loop completes in O(1) time (fixed 9x9 board). Three maps track row, column, and 3x3 box constraints simultaneously. No duplicate found \u2192 return true. Space O(1) for 3 fixed-size maps.",highlightLine:21,state:{type:"grid",grid:(()=>{let a=A();return a.forEach(e=>e.forEach(o=>{o.state==="land"&&(o.state="visited")})),a})(),counters:[{label:"result",value:"true"},{label:"time",value:"O(1)"},{label:"space",value:"O(1)"}]}}),i}var gl={label:"Multi-Pass (Row \u2192 Col \u2192 Box)",pythonCode:dl,generateSteps:pl},fl={label:"Single-Loop with 3 Maps",pythonCode:cl,generateSteps:ml},Ht={id:"valid-sudoku",lcNumber:36,title:"Valid Sudoku",difficulty:"Medium",category:"arrays-hash",tags:["Array","Hash Set","Matrix"],timeComplexity:"O(1)",spaceComplexity:"O(1)",description:"Determine if a 9x9 Sudoku board is valid. Each row, column, and 3x3 sub-box must contain the digits 1-9 without repetition. Only filled cells need to be validated.",examples:[{input:'board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]',output:"true"},{input:'board = [["8","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]',output:"false",explanation:"Two 8s in the top-left 3x3 box."}],constraints:["board.length == 9","board[i].length == 9",'board[i][j] is a digit 1-9 or "."'],hint:"Use a set per row/col/box to track seen digits. The 3x3 box key is (row//3, col//3). Optimized: combine all three checks into a single double-loop using 3 defaultdict(set) maps.",solutions:[gl,fl]};var vl=`from typing import List

class Solution:
    def sortArrayMergeSort(self, nums: List[int]) -> List[int]:
        # recursive divide and conquer
        # using two pointer (left and right to keep track of the sub-arrays)
        # since its recursive, we should create a helper

        def merge(array, l, m, r):
            leftArray = array[l:m+1] # array[left:right] is inclusive of left and exclusive of right
            rightArray = array[m+1:r+1]

            # we'll use 3 pointers here
            # numsPointer to increment and perform the merge in source array starting from the left
            # leftPointer to traverse through leftArray
            # rightPointer to traverse through rightArray

            numsPointer, leftPointer, rightPointer = l, 0, 0

            while leftPointer < len(leftArray) and rightPointer < len(rightArray):
                if leftArray[leftPointer] < rightArray[rightPointer]:
                    array[numsPointer] = leftArray[leftPointer]
                    leftPointer+=1
                else:
                    array[numsPointer] = rightArray[rightPointer]
                    rightPointer+=1
                numsPointer+=1

            # handle case where original array is skewed
            # thus we are exiting prior while without having through all of both arrays

            while leftPointer < len(leftArray):
                array[numsPointer] = leftArray[leftPointer]
                leftPointer+=1
                numsPointer+=1

            while rightPointer < len(rightArray):
                array[numsPointer] = rightArray[rightPointer]
                rightPointer+=1
                numsPointer+=1

        def mergeSort(array, l, r):
            # two pointer to keep track of sub-arrays
            # base case: array size = 1, which means l = r
            if l == r:
                return array
            # split the array in half to recurse through
            m = (l + r) // 2
            # split arrays recursively halving each time
            mergeSort(array, l, m)
            mergeSort(array, m+1, r)
            # merge the split arrays
            merge(array, l, m, r)
            return array

        return mergeSort(nums, 0, len(nums)-1)`;function yl(){let i=[],r=[...[5,2,3,1]];return i.push({explanation:"Sort nums=[5,2,3,1] using Merge Sort. Strategy: divide and conquer \u2014 recursively split the array in half until each sub-array has size 1, then merge sorted halves back together. Time O(n log n), Space O(n) for temporary arrays.",highlightLine:4,state:{type:"array",cells:r.map(s=>({value:s,state:"default"})),pointers:[],counters:[{label:"input",value:"[5,2,3,1]"},{label:"l",value:0},{label:"r",value:3}]}}),i.push({explanation:"mergeSort(array, l=0, r=3): l != r so we split. m = (0+3)//2 = 1. Left half = array[0..1] = [5,2], right half = array[2..3] = [3,1].",highlightLine:44,state:{type:"array",cells:[{value:5,state:"window"},{value:2,state:"window"},{value:3,state:"active"},{value:1,state:"active"}],pointers:[{index:0,label:"l"},{index:1,label:"m"},{index:3,label:"r"}],counters:[{label:"call",value:"mergeSort(0,3)"},{label:"m",value:1}]}}),i.push({explanation:"Recurse left: mergeSort(array, l=0, r=1). m = (0+1)//2 = 0. Left = array[0..0] = [5], right = array[1..1] = [2].",highlightLine:47,state:{type:"array",cells:[{value:5,state:"window"},{value:2,state:"window"},{value:3,state:"default"},{value:1,state:"default"}],pointers:[{index:0,label:"l/m"},{index:1,label:"r"}],counters:[{label:"call",value:"mergeSort(0,1)"},{label:"m",value:0}]}}),i.push({explanation:"mergeSort(array, l=0, r=0): base case l==r \u2014 single element [5], already sorted. Return.",highlightLine:42,state:{type:"array",cells:[{value:5,state:"found"},{value:2,state:"default"},{value:3,state:"default"},{value:1,state:"default"}],pointers:[{index:0,label:"l=r=0"}],counters:[{label:"call",value:"mergeSort(0,0) \u2192 base"}]}}),i.push({explanation:"mergeSort(array, l=1, r=1): base case l==r \u2014 single element [2], already sorted. Return.",highlightLine:42,state:{type:"array",cells:[{value:5,state:"found"},{value:2,state:"found"},{value:3,state:"default"},{value:1,state:"default"}],pointers:[{index:1,label:"l=r=1"}],counters:[{label:"call",value:"mergeSort(1,1) \u2192 base"}]}}),i.push({explanation:"merge(array, l=0, m=0, r=1): leftArray=[5], rightArray=[2]. Compare leftArray[0]=5 vs rightArray[0]=2. 5 >= 2 \u2192 place 2 at array[0], rightPointer++, numsPointer++.",highlightLine:20,state:{type:"array",cells:[{value:5,state:"active"},{value:2,state:"active"},{value:3,state:"default"},{value:1,state:"default"}],pointers:[{index:0,label:"numsPtr"},{index:1,label:"rPtr\u21922"}],counters:[{label:"leftArray",value:"[5]"},{label:"rightArray",value:"[2]"},{label:"compare",value:"5 >= 2 \u2192 place 2"}]}}),r[0]=2,i.push({explanation:"rightPointer exhausted. Drain leftArray: place 5 at array[1]. merge done. array[0..1] = [2,5].",highlightLine:32,state:{type:"array",cells:[{value:2,state:"found"},{value:5,state:"found"},{value:3,state:"default"},{value:1,state:"default"}],pointers:[],counters:[{label:"merged [0..1]",value:"[2,5]"},{label:"comparisons",value:1}]}}),r[1]=5,i.push({explanation:"Recurse right: mergeSort(array, l=2, r=3). m = (2+3)//2 = 2. Left = array[2..2] = [3], right = array[3..3] = [1]. Both are base cases.",highlightLine:48,state:{type:"array",cells:[{value:2,state:"visited"},{value:5,state:"visited"},{value:3,state:"window"},{value:1,state:"window"}],pointers:[{index:2,label:"l/m"},{index:3,label:"r"}],counters:[{label:"call",value:"mergeSort(2,3)"}]}}),i.push({explanation:"mergeSort(2,2) and mergeSort(3,3) both hit base case. Now merge(array, l=2, m=2, r=3): leftArray=[3], rightArray=[1]. 3 >= 1 \u2192 place 1 first, then 3.",highlightLine:20,state:{type:"array",cells:[{value:2,state:"visited"},{value:5,state:"visited"},{value:3,state:"active"},{value:1,state:"active"}],pointers:[{index:2,label:"lPtr\u21923"},{index:3,label:"rPtr\u21921"}],counters:[{label:"compare",value:"3 >= 1 \u2192 place 1"},{label:"comparisons",value:2}]}}),r[2]=1,r[3]=3,i.push({explanation:"merge done. array[2..3] = [1,3]. Both halves are now sorted: left=[2,5], right=[1,3]. Final merge needed.",highlightLine:32,state:{type:"array",cells:[{value:2,state:"visited"},{value:5,state:"visited"},{value:1,state:"found"},{value:3,state:"found"}],pointers:[],counters:[{label:"merged [2..3]",value:"[1,3]"}]}}),i.push({explanation:"Final merge(array, l=0, m=1, r=3): leftArray=[2,5], rightArray=[1,3]. Compare left[0]=2 vs right[0]=1. 2 >= 1 \u2192 place 1 at array[0], rightPointer++.",highlightLine:20,state:{type:"array",cells:[{value:2,state:"active"},{value:5,state:"window"},{value:1,state:"active"},{value:3,state:"window"}],pointers:[{index:0,label:"numsPtr"},{index:0,label:"lPtr\u21922"},{index:2,label:"rPtr\u21921"}],counters:[{label:"leftArray",value:"[2,5]"},{label:"rightArray",value:"[1,3]"},{label:"compare",value:"2 >= 1 \u2192 place 1"},{label:"comparisons",value:3}]}}),i.push({explanation:"Compare left[0]=2 vs right[1]=3. 2 < 3 \u2192 place 2 at array[1], leftPointer++.",highlightLine:21,state:{type:"array",cells:[{value:1,state:"found"},{value:2,state:"active"},{value:5,state:"window"},{value:3,state:"active"}],pointers:[{index:1,label:"numsPtr"}],counters:[{label:"compare",value:"2 < 3 \u2192 place 2"},{label:"comparisons",value:4}]}}),i.push({explanation:"Compare left[1]=5 vs right[1]=3. 5 >= 3 \u2192 place 3 at array[2], rightPointer++. rightArray exhausted. Drain leftArray: place 5 at array[3].",highlightLine:23,state:{type:"array",cells:[{value:1,state:"found"},{value:2,state:"found"},{value:3,state:"active"},{value:5,state:"active"}],pointers:[{index:2,label:"numsPtr"}],counters:[{label:"compare",value:"5 >= 3 \u2192 place 3, then drain 5"},{label:"comparisons",value:5}]}}),i.push({explanation:"All merges complete. Final sorted array: [1,2,3,5]. Merge Sort divides into O(log n)=2 levels, each level does O(n) work \u2192 O(n log n) total. Space O(n) for temporary left/right arrays during merge.",highlightLine:51,state:{type:"array",cells:[1,2,3,5].map(s=>({value:s,state:"found"})),pointers:[],counters:[{label:"output",value:"[1,2,3,5]"},{label:"time",value:"O(n log n)"},{label:"space",value:"O(n)"},{label:"total comparisons",value:5}]}}),i}var bl={label:"Merge Sort (Divide & Conquer)",pythonCode:vl,generateSteps:yl},_t={id:"sort-an-array",lcNumber:912,title:"Sort an Array",difficulty:"Medium",category:"arrays-hash",tags:["Array","Merge Sort","Heap Sort"],timeComplexity:"O(n log n)",spaceComplexity:"O(n)",description:"Sort an array of integers in ascending order in O(n log n) time with minimal space. Must not use built-in sort functions.",examples:[{input:"nums = [5,2,3,1]",output:"[1,2,3,5]"},{input:"nums = [5,1,1,2,0,0]",output:"[0,0,1,1,2,5]"}],constraints:["1 \u2264 nums.length \u2264 5 \xD7 10\u2074","-5 \xD7 10\u2074 \u2264 nums[i] \u2264 5 \xD7 10\u2074"],hint:"Merge Sort: recursively split the array in half (using l/m/r pointers) until single elements, then merge sorted halves using 3 pointers (numsPointer, leftPointer, rightPointer). Drain remaining elements from whichever sub-array is not exhausted first.",solutions:[bl]};var wl=`from typing import List

class Solution:
    # time complexity: O(nlogm + mlogm) ; mlogm to sort the potion ; nlogm to find min boundary
    def successfulPairs(self, spells: List[int], potions: List[int], success: int) -> List[int]:
        # ok so first thing to notice is that size of output = len(spells)
        # brute force solution is to just iterate over both, check spells[i]*potions[j]>success and increment output[i]
        # this would be a O(n*m) solution
        # so note that we are keeping track of numbers of success, so ordering doesn't matter much, so we can sort potions
        # if we can sort potions, we can find the minimum potion strength such that it is successful
        # so what this becomes is a min boundary binary search problem
        # condition that we found the min is that if potions[mid] * spells[i] >= success and potions[right] * spells[i] >= success
        # that means we definitely want to go to the left

        successRate = [0] * len(spells)

        potions.sort()

        for i in range(len(spells)):
            l, r = 0, len(potions) - 1
            while l < r:
                mid = (l + r) // 2
                if potions[mid] * spells[i] >= success:
                    r = mid
                else:
                    l = mid + 1

            # if min boundary is < success, then assign 0
            if potions[l] * spells[i] < success:
                successRate[i] = 0
            else:
                successRate[i] = len(potions) - l

        return successRate`;function xl(){let i=[],u=[5,1,3],r=[1,2,3,4,5],s=7,n=[0,0,0];return i.push({explanation:"spells=[5,1,3], potions=[1,2,3,4,5], success=7. Output size = len(spells) = 3. Brute force O(n*m) checks every pair. Optimization: since ordering of potions does not affect count, sort potions first, then binary search to find the minimum potion index where spell*potion >= success.",highlightLine:4,state:{type:"array",cells:r.map(t=>({value:t,state:"default"})),pointers:[],counters:[{label:"spells",value:"[5,1,3]"},{label:"success",value:s},{label:"pairs so far",value:"[0,0,0]"}]}}),i.push({explanation:"potions.sort(): sort potions ascending. Result: [1,2,3,4,5] (already sorted in this case). Sorting costs O(m log m). Now binary search on sorted potions for each spell: find leftmost index where potions[mid]*spell >= success.",highlightLine:17,state:{type:"array",cells:r.map(t=>({value:t,state:"visited"})),pointers:[],counters:[{label:"sorted potions",value:"[1,2,3,4,5]"},{label:"sort cost",value:"O(m log m)"}]}}),i.push({explanation:"Spell 0: strength=5. We need potions[mid]*5 >= 7, i.e. potions[mid] >= 1.4, so min potion=2 (index 1). Binary search on [1,2,3,4,5] with l=0, r=4.",highlightLine:19,state:{type:"array",cells:r.map(t=>({value:t,state:"window"})),pointers:[{index:0,label:"l"},{index:4,label:"r"}],counters:[{label:"spell",value:5},{label:"success threshold",value:s},{label:"need potion >=",value:"7/5=1.4"},{label:"pairs so far",value:"[?,0,0]"}]}}),i.push({explanation:"l=0, r=4, mid=2. potions[2]=3. 3*5=15 >= 7 \u2192 success! Condition met, but we want the MINIMUM boundary, so set r=mid=2 (try to go further left).",highlightLine:22,state:{type:"array",cells:[{value:1,state:"window"},{value:2,state:"window"},{value:3,state:"active"},{value:4,state:"eliminated"},{value:5,state:"eliminated"}],pointers:[{index:0,label:"l"},{index:2,label:"mid/r\u2192"}],counters:[{label:"spell",value:5},{label:"potions[2]*5",value:"3*5=15"},{label:"15 >= 7?",value:"YES \u2192 r=mid=2"}]}}),i.push({explanation:"l=0, r=2, mid=1. potions[1]=2. 2*5=10 >= 7 \u2192 success! Set r=mid=1.",highlightLine:22,state:{type:"array",cells:[{value:1,state:"window"},{value:2,state:"active"},{value:3,state:"eliminated"},{value:4,state:"eliminated"},{value:5,state:"eliminated"}],pointers:[{index:0,label:"l"},{index:1,label:"mid/r\u2192"}],counters:[{label:"spell",value:5},{label:"potions[1]*5",value:"2*5=10"},{label:"10 >= 7?",value:"YES \u2192 r=mid=1"}]}}),i.push({explanation:"l=0, r=1, mid=0. potions[0]=1. 1*5=5 < 7 \u2192 not successful. Set l=mid+1=1. Now l==r==1, loop ends. Min boundary index=1. Check: potions[1]*5=10>=7 \u2192 successRate[0] = len(potions)-l = 5-1 = 4.",highlightLine:24,state:{type:"array",cells:[{value:1,state:"eliminated"},{value:2,state:"found"},{value:3,state:"found"},{value:4,state:"found"},{value:5,state:"found"}],pointers:[{index:1,label:"cutoff (l=r=1)"}],counters:[{label:"spell",value:5},{label:"potions[0]*5",value:"1*5=5 < 7 \u2192 l=1"},{label:"cutoff index",value:1},{label:"pairs = 5-1",value:4}]}}),n[0]=4,i.push({explanation:"Spell 1: strength=1. Need potions[mid]*1 >= 7, i.e. potion >= 7. Max potion is 5 which is < 7 \u2014 no successful pairs exist. Binary search: l=0, r=4.",highlightLine:19,state:{type:"array",cells:r.map(t=>({value:t,state:"window"})),pointers:[{index:0,label:"l"},{index:4,label:"r"}],counters:[{label:"spell",value:1},{label:"need potion >=",value:"7/1=7 (impossible)"},{label:"pairs so far",value:`[${n[0]},?,0]`}]}}),i.push({explanation:"Binary search narrows down: potions[mid]*1 always < 7 for all potions. Eventually l=r=4. Check: potions[4]*1=5 < 7 \u2192 condition fails \u2192 successRate[1]=0.",highlightLine:28,state:{type:"array",cells:r.map(t=>({value:t,state:"eliminated"})),pointers:[{index:4,label:"l=r=4"}],counters:[{label:"spell",value:1},{label:"potions[4]*1",value:"5 < 7 \u2192 0 pairs"},{label:"successRate[1]",value:0}]}}),n[1]=0,i.push({explanation:"Spell 2: strength=3. Need potions[mid]*3 >= 7, i.e. potion >= 2.33, so min potion=3 (index 2). Binary search: l=0, r=4.",highlightLine:19,state:{type:"array",cells:r.map(t=>({value:t,state:"window"})),pointers:[{index:0,label:"l"},{index:4,label:"r"}],counters:[{label:"spell",value:3},{label:"need potion >=",value:"7/3\u22482.33"},{label:"pairs so far",value:`[${n[0]},${n[1]},?]`}]}}),i.push({explanation:"l=0, r=4, mid=2. potions[2]=3. 3*3=9 >= 7 \u2192 success! r=mid=2.",highlightLine:22,state:{type:"array",cells:[{value:1,state:"window"},{value:2,state:"window"},{value:3,state:"active"},{value:4,state:"eliminated"},{value:5,state:"eliminated"}],pointers:[{index:0,label:"l"},{index:2,label:"mid/r\u2192"}],counters:[{label:"spell",value:3},{label:"potions[2]*3",value:"3*3=9 >= 7 \u2192 r=2"}]}}),i.push({explanation:"l=0, r=2, mid=1. potions[1]=2. 2*3=6 < 7 \u2192 not successful. l=mid+1=2. Now l==r==2. Check: potions[2]*3=9>=7 \u2192 successRate[2]=5-2=3.",highlightLine:24,state:{type:"array",cells:[{value:1,state:"eliminated"},{value:2,state:"eliminated"},{value:3,state:"found"},{value:4,state:"found"},{value:5,state:"found"}],pointers:[{index:2,label:"cutoff (l=r=2)"}],counters:[{label:"spell",value:3},{label:"potions[1]*3",value:"2*3=6 < 7 \u2192 l=2"},{label:"cutoff index",value:2},{label:"pairs = 5-2",value:3}]}}),n[2]=3,i.push({explanation:`All spells processed. successRate=[${n.join(",")}]. Algorithm: sort potions O(m log m) + binary search per spell O(n log m) = O((n+m) log m) total. Space O(n) for output. Key insight: sorting potions lets us use binary search (min-boundary variant) instead of O(n*m) brute force.`,highlightLine:31,state:{type:"array",cells:r.map(t=>({value:t,state:"found"})),pointers:[],counters:[{label:"spell=5 pairs",value:n[0]},{label:"spell=1 pairs",value:n[1]},{label:"spell=3 pairs",value:n[2]},{label:"output",value:`[${n.join(",")}]`}]}}),i}var $l={label:"Sort Potions + Binary Search (Min Boundary)",pythonCode:wl,generateSteps:xl},Wt={id:"successful-pairs-spells-potions",lcNumber:2300,title:"Successful Pairs of Spells and Potions",difficulty:"Medium",category:"binary-search",tags:["Array","Binary Search","Sorting"],timeComplexity:"O(n log n)",spaceComplexity:"O(n)",description:"Given spells, potions, and a success threshold, find for each spell how many potions form a successful pair (spell*potion >= success). Return an array of counts.",examples:[{input:"spells = [5,1,3], potions = [1,2,3,4,5], success = 7",output:"[4,0,3]",explanation:"Spell 5: 4 potions work. Spell 1: 0 potions work. Spell 3: 3 potions work."},{input:"spells = [3,1,2], potions = [8,5,8], success = 16",output:"[2,0,2]"}],constraints:["n == spells.length","m == potions.length","1 \u2264 n, m \u2264 10\u2075","1 \u2264 spells[i], potions[i] \u2264 10\u2075","1 \u2264 success \u2264 10\xB9\u2070"],hint:"Sort potions. For each spell, binary search for the leftmost potion index where potions[mid]*spell >= success (min-boundary search: if condition met set r=mid, else set l=mid+1). Pairs = len(potions) - l (if potions[l]*spell >= success, else 0).",solutions:[$l]};var kl=`from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        # processing children first
        # thus postorder dfs

        # when root is null, return
        if not root:
            return root

        self.invertTree(root.left)
        self.invertTree(root.right)
        temp = root.left
        root.left = root.right
        root.right = temp

        # return the root
        return root`;function ve(i,u){return Object.entries(i).map(([r,s])=>({id:r,value:s.value,state:u?.[r]??s.state??"default",leftId:s.leftId,rightId:s.rightId}))}function Sl(){let i=[];return i.push({explanation:"Intro: postorder DFS \u2014 recurse left, recurse right, then swap. We visit leaves first and work back up.",highlightLine:10,state:{type:"tree",nodes:ve({n0:{value:4,leftId:"n1",rightId:"n2"},n1:{value:2,leftId:"n3",rightId:"n4"},n2:{value:7,leftId:"n5",rightId:"n6"},n3:{value:1,leftId:null,rightId:null},n4:{value:3,leftId:null,rightId:null},n5:{value:6,leftId:null,rightId:null},n6:{value:9,leftId:null,rightId:null}})}}),i.push({explanation:"Recurse all the way down left subtree. We reach node 1 (leaf). No children \u2014 return up.",highlightLine:18,state:{type:"tree",nodes:ve({n0:{value:4,leftId:"n1",rightId:"n2"},n1:{value:2,leftId:"n3",rightId:"n4"},n2:{value:7,leftId:"n5",rightId:"n6"},n3:{value:1,leftId:null,rightId:null},n4:{value:3,leftId:null,rightId:null},n5:{value:6,leftId:null,rightId:null},n6:{value:9,leftId:null,rightId:null}},{n3:"active"})}}),i.push({explanation:"Recurse down right of node 2. We reach node 3 (leaf). No children \u2014 return up.",highlightLine:18,state:{type:"tree",nodes:ve({n0:{value:4,leftId:"n1",rightId:"n2"},n1:{value:2,leftId:"n3",rightId:"n4"},n2:{value:7,leftId:"n5",rightId:"n6"},n3:{value:1,leftId:null,rightId:null},n4:{value:3,leftId:null,rightId:null},n5:{value:6,leftId:null,rightId:null},n6:{value:9,leftId:null,rightId:null}},{n3:"visited",n4:"active"})}}),i.push({explanation:"Back at node 2. Left=1, right=3. Swap children: node 2's left becomes 3, right becomes 1.",highlightLine:21,state:{type:"tree",nodes:[{id:"n0",value:4,state:"default",leftId:"n1",rightId:"n2"},{id:"n1",value:2,state:"active",leftId:"n4",rightId:"n3"},{id:"n2",value:7,state:"default",leftId:"n5",rightId:"n6"},{id:"n3",value:1,state:"visited",leftId:null,rightId:null},{id:"n4",value:3,state:"visited",leftId:null,rightId:null},{id:"n5",value:6,state:"default",leftId:null,rightId:null},{id:"n6",value:9,state:"default",leftId:null,rightId:null}]}}),i.push({explanation:"Recurse down left of root's right child (node 7). Reach node 6 (leaf).",highlightLine:18,state:{type:"tree",nodes:[{id:"n0",value:4,state:"default",leftId:"n1",rightId:"n2"},{id:"n1",value:2,state:"visited",leftId:"n4",rightId:"n3"},{id:"n2",value:7,state:"default",leftId:"n5",rightId:"n6"},{id:"n3",value:1,state:"visited",leftId:null,rightId:null},{id:"n4",value:3,state:"visited",leftId:null,rightId:null},{id:"n5",value:6,state:"active",leftId:null,rightId:null},{id:"n6",value:9,state:"default",leftId:null,rightId:null}]}}),i.push({explanation:"Recurse down right of node 7. Reach node 9 (leaf).",highlightLine:18,state:{type:"tree",nodes:[{id:"n0",value:4,state:"default",leftId:"n1",rightId:"n2"},{id:"n1",value:2,state:"visited",leftId:"n4",rightId:"n3"},{id:"n2",value:7,state:"default",leftId:"n5",rightId:"n6"},{id:"n3",value:1,state:"visited",leftId:null,rightId:null},{id:"n4",value:3,state:"visited",leftId:null,rightId:null},{id:"n5",value:6,state:"visited",leftId:null,rightId:null},{id:"n6",value:9,state:"active",leftId:null,rightId:null}]}}),i.push({explanation:"Back at node 7. Swap children: node 7's left becomes 9, right becomes 6.",highlightLine:21,state:{type:"tree",nodes:[{id:"n0",value:4,state:"default",leftId:"n1",rightId:"n2"},{id:"n1",value:2,state:"visited",leftId:"n4",rightId:"n3"},{id:"n2",value:7,state:"active",leftId:"n6",rightId:"n5"},{id:"n3",value:1,state:"visited",leftId:null,rightId:null},{id:"n4",value:3,state:"visited",leftId:null,rightId:null},{id:"n5",value:6,state:"visited",leftId:null,rightId:null},{id:"n6",value:9,state:"visited",leftId:null,rightId:null}]}}),i.push({explanation:"Back at root (4). Swap children: left becomes node 7, right becomes node 2. Tree fully inverted.",highlightLine:21,state:{type:"tree",nodes:[{id:"n0",value:4,state:"active",leftId:"n2",rightId:"n1"},{id:"n1",value:2,state:"found",leftId:"n4",rightId:"n3"},{id:"n2",value:7,state:"found",leftId:"n6",rightId:"n5"},{id:"n3",value:1,state:"found",leftId:null,rightId:null},{id:"n4",value:3,state:"found",leftId:null,rightId:null},{id:"n5",value:6,state:"found",leftId:null,rightId:null},{id:"n6",value:9,state:"found",leftId:null,rightId:null}]}}),i}var zt={id:"invert-binary-tree",lcNumber:226,title:"Invert Binary Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS","BFS","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given the root of a binary tree, invert the tree, and return its root.",examples:[{input:"root = [4,2,7,1,3,6,9]",output:"[4,7,2,9,6,3,1]",explanation:"Swap every left and right child recursively (postorder DFS)."}],constraints:["The number of nodes in the tree is in the range [0, 100].","-100 <= Node.val <= 100"],hint:"Use postorder DFS: recurse left, recurse right, then swap the two children. This ensures children are already inverted before the parent swaps them.",solutions:[{label:"Postorder DFS (Recursive)",pythonCode:kl,generateSteps:Sl}]};var Ll=`from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        # max depth = dfs
        # how do we think about this? is this postorder/preorder/inorder
        # we can go as deep as possible and when we get to null children, we return 0
        # then go backwards, so this would mean postorder
        # since we want max depth, we would return max of either directions

        if not root:
            return 0

        # these 2 returns are the same
        # return max(1+self.maxDepth(root.left),1+self.maxDepth(root.right))
        return 1+max(self.maxDepth(root.left),self.maxDepth(root.right))`,ye=[{id:"n0",value:3,leftId:"n1",rightId:"n2"},{id:"n1",value:9,leftId:null,rightId:null},{id:"n2",value:20,leftId:"n3",rightId:"n4"},{id:"n3",value:15,leftId:null,rightId:null},{id:"n4",value:7,leftId:null,rightId:null}];function Ol(){let i=[],u=new Map(ye.map(l=>[l.id,l])),r=l=>u.get(l).value,s={},n=0,t=()=>ye.map(l=>x(y({},l),{state:s[l.id]??"default"})),a=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:t(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 here"}]:[],counters:[{label:"call stack depth",value:n},...d.counters??[]]},variables:d.vars})};a('Goal: max depth = the number of nodes on the longest root\u2192leaf path. Strategy: postorder DFS \u2014 to know a node\u2019s depth we must FIRST know both children\u2019s depths, so we dive all the way down, then build the answer back up. A null (missing) child counts as depth 0. Watch the "call stack depth" counter grow as we dive and shrink as we return.',11,{vars:[{name:"root",value:3}]});function e(l,h,d){if(l===null)return a(`${h} is null \u2192 base case "if not root: return 0". A missing node has depth 0, so we return 0 right away without recursing deeper.`,18,{current:d,vars:[{name:"node",value:"null"},{name:"returns",value:0,highlight:!0}]}),0;n++;let c=r(l);s[l]="active",a(`Call maxDepth(node ${c}) \u2014 push it on the call stack (depth now ${n}). We can\u2019t compute its depth yet; first recurse into its LEFT child.`,22,{current:l,vars:[{name:"node",value:c}]});let p=e(u.get(l).leftId,`Left child of ${c}`,l);s[l]="active",a(`Back at node ${c}. Its left subtree returned depth ${p}. Now recurse into the RIGHT child.`,22,{current:l,vars:[{name:"node",value:c},{name:"left",value:p,highlight:!0}]});let m=e(u.get(l).rightId,`Right child of ${c}`,l),f=1+Math.max(p,m);return s[l]="visited",n--,a(`Node ${c} is done: left=${p}, right=${m} \u2192 maxDepth(${c}) = 1 + max(${p}, ${m}) = ${f}. Pop it off the stack and return ${f} up to its parent (depth now ${n}).`,22,{current:l,vars:[{name:"node",value:c},{name:"left",value:p},{name:"right",value:m},{name:"return",value:f,highlight:!0}]}),f}let o=e("n0","root",null);return ye.forEach(l=>s[l.id]="found"),a(`Every node has been visited and the recursion has fully unwound. The root returned ${o}, so the maximum depth is ${o} \u2014 the longest path 3 \u2192 20 \u2192 15 (or 7).`,22,{vars:[{name:"maxDepth",value:o,highlight:!0}]}),i}var Yt={id:"max-depth-of-binary-tree",lcNumber:104,title:"Maximum Depth of Binary Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS","BFS","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",examples:[{input:"root = [3,9,20,null,null,15,7]",output:"3",explanation:"The longest path is 3 \u2192 20 \u2192 15 (or 7), which has depth 3."}],constraints:["The number of nodes in the tree is in the range [0, 10^4].","-100 <= Node.val <= 100"],hint:"Use postorder DFS: recurse left and right children first, then return 1 + max(leftDepth, rightDepth). Base case: null node returns 0.",solutions:[{label:"Postorder DFS (Recursive)",pythonCode:Ll,generateSteps:Ol}]};var Cl=`from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        # so what it looks like if we have to get max of both sides of the subtree and add it
        # in the example, we get depth of 2 on left and depth of 1 and the right
        # thus we return 3
        # thus this is postorder dfs
        # issue is we need to keep track of the max diameter as well as max of left and right
        # so we need to have a helper function

        maxDiameter = 0

        def dfs(root):
            nonlocal maxDiameter

            if not root:
                return 0

            left = dfs(root.left)
            right = dfs(root.right)
            maxDiameter = max(maxDiameter, left + right)

            # return the max depth to caller
            return 1 + max(left, right)

        dfs(root)
        return maxDiameter`,be=[{id:"n0",value:1,leftId:"n1",rightId:"n2"},{id:"n1",value:2,leftId:"n3",rightId:"n4"},{id:"n2",value:3,leftId:null,rightId:null},{id:"n3",value:4,leftId:null,rightId:null},{id:"n4",value:5,leftId:null,rightId:null}];function Ml(){let i=[],u=new Map(be.map(l=>[l.id,l])),r=l=>u.get(l).value,s={},n=0,t=0,a=()=>be.map(l=>x(y({},l),{state:s[l.id]??"default"})),e=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:a(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 here"}]:[],counters:[{label:"call stack depth",value:n},{label:"maxDiameter",value:t}]},variables:d.vars})};e("Diameter = longest path (counted in edges) between any two nodes. Key insight: the longest path that bends at a given node = leftDepth + rightDepth of that node. So we run a postorder DFS that returns each subtree\u2019s depth, and at every node we update a shared maxDiameter with left+right. Start maxDiameter = 0.",18,{vars:[{name:"maxDiameter",value:0}]});function o(l,h,d){if(l===null)return e(`${h} is null \u2192 base case "return 0". A missing subtree has depth 0.`,24,{current:d,vars:[{name:"node",value:"null"},{name:"returns",value:0,highlight:!0}]}),0;n++;let c=r(l);s[l]="active",e(`Call dfs(node ${c}) \u2014 push on the call stack (depth now ${n}). Recurse LEFT first.`,26,{current:l,vars:[{name:"node",value:c}]});let p=o(u.get(l).leftId,`Left child of ${c}`,l);s[l]="active",e(`Back at node ${c}. Left depth = ${p}. Now recurse RIGHT.`,27,{current:l,vars:[{name:"node",value:c},{name:"left",value:p,highlight:!0}]});let m=o(u.get(l).rightId,`Right child of ${c}`,l),f=p+m,g=t;t=Math.max(t,f);let v=1+Math.max(p,m);return s[l]="visited",n--,e(`Node ${c}: leftDepth=${p}, rightDepth=${m}. Longest path bending at ${c} = ${p}+${m} = ${f}. maxDiameter = max(${g}, ${f}) = ${t}. Then return this subtree\u2019s depth = 1 + max(${p}, ${m}) = ${v} to the parent.`,28,{current:l,vars:[{name:"node",value:c},{name:"left",value:p},{name:"right",value:m},{name:"left+right",value:f,highlight:t===f&&f>g},{name:"return",value:v,highlight:!0}]}),v}return o("n0","root",null),be.forEach(l=>s[l.id]="found"),e(`Recursion finished. The largest left+right seen at any node was ${t}, so the diameter is ${t} (path 4 \u2192 2 \u2192 1 \u2192 3).`,34,{vars:[{name:"maxDiameter",value:t,highlight:!0}]}),i}var Gt={id:"diameter-of-binary-tree",lcNumber:543,title:"Diameter of Binary Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given the root of a binary tree, return the length of the diameter of the tree. The diameter is the length of the longest path between any two nodes \u2014 this path may or may not pass through the root.",examples:[{input:"root = [1,2,3,4,5]",output:"3",explanation:"Longest path: 4 \u2192 2 \u2192 1 \u2192 3 (length 3), or 5 \u2192 2 \u2192 1 \u2192 3 (length 3)."}],constraints:["The number of nodes in the tree is in the range [1, 10^4].","-100 <= Node.val <= 100"],hint:"At each node, the diameter through it equals leftDepth + rightDepth. Use postorder DFS, track maxDiameter as a non-local variable, and return 1 + max(left, right) to the caller.",solutions:[{label:"Postorder DFS",pythonCode:Cl,generateSteps:Ml}]};var Tl=`from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        # another dfs question since we want to check difference in depth
        # how do we know if a tree is height balanced?
        # it is height balanced if absolute depth of left - right > 1
        # we are checking after we return from both left and right side, so postorder dfs
        # I want to just do depth comparison, so basically just do max depth and check the formula above for if it is balanced
        # but maxdepth returns integer, so we need to keep track of the boolean somehow
        # so we will have a global boolean that we can set

        isBalanced = True

        def dfs(root):
            nonlocal isBalanced
            if not root:
                return 0

            left=dfs(root.left)
            right=dfs(root.right)

            if abs(left - right) > 1:
                isBalanced = False

            # left and right are max depth of each side
            return 1 + max(left,right)

        dfs(root)
        return isBalanced`,we=[{id:"n0",value:3,leftId:"n1",rightId:"n2"},{id:"n1",value:9,leftId:null,rightId:null},{id:"n2",value:20,leftId:"n3",rightId:"n4"},{id:"n3",value:15,leftId:null,rightId:null},{id:"n4",value:7,leftId:null,rightId:null}];function Nl(){let i=[],u=new Map(we.map(l=>[l.id,l])),r=l=>u.get(l).value,s={},n=0,t=!0,a=()=>we.map(l=>x(y({},l),{state:s[l.id]??"default"})),e=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:a(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 here"}]:[],counters:[{label:"call stack depth",value:n},{label:"isBalanced",value:String(t)}]},variables:d.vars})};e("A tree is height-balanced if at EVERY node |leftDepth \u2212 rightDepth| \u2264 1. We reuse the max-depth idea: postorder DFS returns each subtree\u2019s depth, and along the way we flip a shared isBalanced flag to False the moment any node breaks the rule. Start with isBalanced = True.",19,{vars:[{name:"isBalanced",value:"True"}]});function o(l,h,d){if(l===null)return e(`${h} is null \u2192 base case "return 0". A missing subtree has depth 0.`,24,{current:d,vars:[{name:"node",value:"null"},{name:"returns",value:0,highlight:!0}]}),0;n++;let c=r(l);s[l]="active",e(`Call dfs(node ${c}) \u2014 push on the call stack (depth now ${n}). Recurse LEFT first to get its left subtree\u2019s depth.`,26,{current:l,vars:[{name:"node",value:c}]});let p=o(u.get(l).leftId,`Left child of ${c}`,l);s[l]="active",e(`Back at node ${c}. Left depth = ${p}. Now recurse RIGHT.`,27,{current:l,vars:[{name:"node",value:c},{name:"left",value:p,highlight:!0}]});let m=o(u.get(l).rightId,`Right child of ${c}`,l),f=Math.abs(p-m),g=f>1;g&&(t=!1);let v=1+Math.max(p,m);return s[l]="visited",n--,e(`Node ${c}: left=${p}, right=${m}. |${p} \u2212 ${m}| = ${f} ${g?"> 1 \u2192 this node is UNBALANCED, set isBalanced = False.":"\u2264 1 \u2192 still balanced here."} Return depth = 1 + max(${p}, ${m}) = ${v}.`,g?30:29,{current:l,vars:[{name:"node",value:c},{name:"left",value:p},{name:"right",value:m},{name:"|left\u2212right|",value:f,highlight:g},{name:"return",value:v,highlight:!0}]}),v}return o("n0","root",null),we.forEach(l=>s[l.id]=t?"found":"visited"),e(`Recursion finished. No node ever broke the rule, so isBalanced is still ${String(t)} \u2014 the tree IS height-balanced.`,36,{vars:[{name:"isBalanced",value:String(t),highlight:!0}]}),i}var Vt={id:"balanced-binary-tree",lcNumber:110,title:"Balanced Binary Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given a binary tree, determine if it is height-balanced. A height-balanced binary tree is one in which the depth of the two subtrees of every node never differs by more than one.",examples:[{input:"root = [3,9,20,null,null,15,7]",output:"true",explanation:"Node 3: |depth(9) - depth(20)| = |1 - 2| = 1 \u2264 1. Balanced."}],constraints:["The number of nodes in the tree is in the range [0, 5000].","-10^4 <= Node.val <= 10^4"],hint:"Use postorder DFS. At each node compute left and right depths. If |left - right| > 1, set isBalanced = False. Track the boolean with nonlocal.",solutions:[{label:"Postorder DFS",pythonCode:Tl,generateSteps:Nl}]};var Il=`from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        # we return false if at any point, these two are not the same
        # we check parent first, so this is preorder dfs

        # base case
        if not p and not q:
            return True
        # if current node is good, we check the rest
        if p and q and p.val == q.val:
            return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
        else:
            return False`,xe=[{id:"n0",value:1,leftId:"n1",rightId:"n2"},{id:"n1",value:2,leftId:null,rightId:null},{id:"n2",value:3,leftId:null,rightId:null}];function ql(){let i=[],u=new Map(xe.map(l=>[l.id,l])),r=l=>u.get(l).value,s={},n=0,t=()=>xe.map(l=>x(y({},l),{state:s[l.id]??"default"})),a=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:t(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 comparing"}]:[],counters:[{label:"call stack depth",value:n}]},variables:d.vars})};a('Two trees are "the same" if they have identical structure AND identical values. We walk both at once with PREorder DFS (check the node first, then its children). Here p = [1,2,3] and q = [1,2,3]. We compare position by position; the first mismatch (value differs, or one side has a node where the other has null) returns False.',11,{vars:[{name:"p",value:"[1,2,3]"},{name:"q",value:"[1,2,3]"}]});function e(l,h,d){if(l===null)return a(`${h}: p and q are BOTH null \u2192 base case "if not p and not q: return True". Two empty subtrees are trivially identical.`,16,{current:d,vars:[{name:"p",value:"null"},{name:"q",value:"null"},{name:"returns",value:"True",highlight:!0}]}),!0;n++;let c=r(l);s[l]="active",a(`Compare ${h}: p.val = ${c} and q.val = ${c} \u2192 equal \u2713. Values match, so recurse into BOTH left children next (call stack depth now ${n}).`,18,{current:l,vars:[{name:"p.val",value:c},{name:"q.val",value:c},{name:"match",value:"True",highlight:!0}]});let p=e(u.get(l).leftId,`Left children of ${c}`,l);s[l]="active",a(`Back at node ${c}. Left children matched (${String(p)}). Now recurse into BOTH right children.`,19,{current:l,vars:[{name:"node",value:c},{name:"leftSame",value:String(p),highlight:!0}]});let m=e(u.get(l).rightId,`Right children of ${c}`,l),f=p&&m;return s[l]="visited",n--,a(`Node ${c} fully checked: value matched, leftSame=${String(p)}, rightSame=${String(m)}. Return ${String(p)} AND ${String(m)} = ${String(f)} up to the caller.`,19,{current:l,vars:[{name:"node",value:c},{name:"return",value:String(f),highlight:!0}]}),f}let o=e("n0","root",null);return xe.forEach(l=>s[l.id]=o?"found":"visited"),a(`Every position matched and the recursion returned ${String(o)} all the way to the root, so the trees are identical \u2192 isSameTree returns ${String(o)}.`,18,{vars:[{name:"result",value:String(o),highlight:!0}]}),i}var Ut={id:"same-tree",lcNumber:100,title:"Same Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS","BFS","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given the roots of two binary trees p and q, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.",examples:[{input:"p = [1,2,3], q = [1,2,3]",output:"true",explanation:"Both trees have identical structure and node values."},{input:"p = [1,2], q = [1,null,2]",output:"false",explanation:"Different structure: node 2 is on different sides."}],constraints:["The number of nodes in both trees is in the range [0, 100].","-10^4 <= Node.val <= 10^4"],hint:"Use preorder DFS. Base case: both null \u2192 True. If values match, recurse on both left and right children.",solutions:[{label:"Preorder DFS (Recursive)",pythonCode:Il,generateSteps:ql}]};var Rl=`from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        # so this is like a combo problem
        # we want to find if the root of subRoot is in root
        # then we want to run isSameTree from there
        # so we can start with a bfs to find the subroot node
        # then we do preorder dfs to check isSameTree

        # bfs is queue based, so we go through the root tree
        # and populate the queue until we find the node we are looking for
        # then we run preorder dfs to find subRoot

        def dfs(p,q):
            if not p and not q:
                return True

            if p and q and p.val == q.val:
                return dfs(p.left,q.left) and dfs(p.right,q.right)
            else:
                return False

        queue = deque([root])

        while queue:
            # deque is both a queue and a stack
            # popleft is equivalent to queue.pop()
            # popright is equivalent to stack.pop()
            currentNode = queue.popleft()

            if currentNode.val == subRoot.val:
                # if found, we just return True
                # if not found, we continue to search
                if dfs(currentNode, subRoot):
                    return True
            if currentNode.left:
                queue.append(currentNode.left)
            if currentNode.right:
                queue.append(currentNode.right)

        return False`,$e=[{id:"n0",value:3,leftId:"n1",rightId:"n2"},{id:"n1",value:4,leftId:"n3",rightId:"n4"},{id:"n2",value:5,leftId:null,rightId:null},{id:"n3",value:1,leftId:null,rightId:null},{id:"n4",value:2,leftId:null,rightId:null}],Pl={s0:{val:4,left:"s1",right:"s2"},s1:{val:1,left:null,right:null},s2:{val:2,left:null,right:null}};function Al(){let i=[],u=new Map($e.map(d=>[d.id,d])),r=d=>u.get(d).value,s=4,n={},t=["n0"],a=()=>$e.map(d=>x(y({},d),{state:n[d.id]??"default"})),e=()=>"["+t.map(d=>r(d)).join(", ")+"]",o=(d,c,p={})=>{i.push({explanation:d,highlightLine:c,state:{type:"tree",nodes:a(),pointers:p.current?[{nodeId:p.current,label:"\u25B6 here"}]:[],counters:[{label:"BFS queue",value:p.queueShown??e()}]},variables:p.vars})};o("Plan (two phases): (1) BFS through the big tree to find any node whose value equals subRoot.val = 4; (2) from each such candidate, run isSameTree to check the WHOLE subtree matches. Start BFS with the root in the queue.",31,{vars:[{name:"subRoot.val",value:s},{name:"queue",value:"[3]"}]});function l(d,c,p,m){let f=c?Pl[c]:null;if(d===null&&f===null)return o(`isSameTree \u2014 ${p}: both sides are null \u2192 base case "return True". Two empty spots match.`,24,{current:m,vars:[{name:"p",value:"null"},{name:"q",value:"null"},{name:"match",value:"True",highlight:!0}]}),!0;if(d===null||f===null)return o(`isSameTree \u2014 ${p}: one side has a node and the other is null \u2192 structures differ, return False.`,29,{current:m,vars:[{name:"match",value:"False",highlight:!0}]}),!1;let g=r(d);if(n[d]="comparing",o(`isSameTree \u2014 ${p}: compare ${g} (big tree) vs ${f.val} (subRoot) \u2192 ${g===f.val?"equal \u2713, recurse into both left children.":"differ \u2717, return False."}`,g===f.val?27:29,{current:d,vars:[{name:"p.val",value:g},{name:"q.val",value:f.val},{name:"match",value:g===f.val?"True":"False",highlight:!0}]}),g!==f.val)return!1;let v=l(u.get(d).leftId,f.left,`left of ${g}`,d),w=l(u.get(d).rightId,f.right,`right of ${g}`,d);return v&&w}let h=!1;for(;t.length&&!h;){let d=t.shift(),c=r(d),p=c===s;if(o(`Dequeue node ${c} (front of queue). Compare its value to subRoot.val ${s}: ${p?"equal \u2014 this is a candidate, launch isSameTree from here.":"not equal, it can't be the subtree root; we'll just enqueue its children and move on."}`,p?39:37,{current:d,queueShown:e(),vars:[{name:"currentNode.val",value:c},{name:"subRoot.val",value:s}]}),p&&l(d,"s0","roots",null)){$e.forEach(g=>{(g.id==="n1"||g.id==="n3"||g.id==="n4")&&(n[g.id]="found")}),o(`isSameTree returned True \u2014 the subtree rooted at node ${c} matches subRoot [4,1,2] exactly. isSubtree returns True; we can stop searching.`,43,{current:d,vars:[{name:"result",value:"True",highlight:!0}]}),h=!0;break}n[d]="visited";let m=u.get(d);m.leftId&&t.push(m.leftId),m.rightId&&t.push(m.rightId),p||o(`Enqueue node ${c}'s children. Queue is now ${e()}, loop again.`,45,{vars:[{name:"queue",value:e()}]})}return i}var Xt={id:"subtree-of-another-tree",lcNumber:572,title:"Subtree of Another Tree",difficulty:"Easy",category:"trees",tags:["Tree","DFS","String Matching"],timeComplexity:"O(m\xB7n)",spaceComplexity:"O(m+n)",description:"Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values as subRoot and false otherwise.",examples:[{input:"root = [3,4,5,1,2], subRoot = [4,1,2]",output:"true",explanation:"The subtree rooted at node 4 in root matches subRoot exactly."}],constraints:["The number of nodes in the root tree is in the range [1, 2000].","The number of nodes in the subRoot tree is in the range [1, 1000].","-10^4 <= root.val, subRoot.val <= 10^4"],hint:"BFS through root to find any node matching subRoot.val, then run isSameTree from that node. If isSameTree returns True, found the subtree.",solutions:[{label:"BFS + DFS",pythonCode:Rl,generateSteps:Al}]};var jl=`from collections import deque
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        # this is just bfs
        # for bfs, we use a queue
        # we insert the root into the queue
        # process it and then insert its left/right children in there
        # main tricky part here is keeping track of number of nodes at each depth

        returnList = []

        queue = deque()
        queue.append(root)

        while queue:
            lenOfQueue = len(queue)
            currentList = []
            # at each step we insert children in
            # thus when we start, queue has all the nodes for the current level
            for i in range(lenOfQueue):
                currentNode = queue.popleft()

                if currentNode:
                    currentList.append(currentNode.val)
                    if currentNode.left:
                        queue.append(currentNode.left)
                    if currentNode.right:
                        queue.append(currentNode.right)
            if currentList:
                returnList.append(currentList)
        return returnList`,ke=[{id:"n0",value:3,leftId:"n1",rightId:"n2"},{id:"n1",value:9,leftId:null,rightId:null},{id:"n2",value:20,leftId:"n3",rightId:"n4"},{id:"n3",value:15,leftId:null,rightId:null},{id:"n4",value:7,leftId:null,rightId:null}];function El(){let i=[],u=new Map(ke.map(d=>[d.id,d])),r=d=>u.get(d).value,s={},n=["n0"],t=[],a=()=>ke.map(d=>x(y({},d),{state:s[d.id]??"default"})),e=()=>"["+n.map(d=>r(d)).join(", ")+"]",o=()=>"["+t.map(d=>"["+d.join(",")+"]").join(", ")+"]",l=(d,c,p={})=>{i.push({explanation:d,highlightLine:c,state:{type:"tree",nodes:a(),pointers:p.current?[{nodeId:p.current,label:"\u25B6 processing"}]:[],counters:[{label:"queue",value:e()},{label:"returnList",value:o()}]},variables:p.vars})};l("Level order = BFS with a queue. The one trick: at the START of each level the queue holds EXACTLY the nodes of that level. So we snapshot the queue length, pop that many nodes into one list, enqueuing their children as we go (those become the next level). Seed the queue with the root.",21,{vars:[{name:"queue",value:"[3]"},{name:"returnList",value:"[]"}]});let h=0;for(;n.length;){let d=n.length,c=[];l(`Level ${h} begins. Snapshot lenOfQueue = ${d} \u2192 there are ${d} node(s) on this level. We'll pop exactly ${d} of them into a fresh currentList = [].`,24,{vars:[{name:"lenOfQueue",value:d,highlight:!0},{name:"currentList",value:"[]"}]});for(let p=0;p<d;p++){let m=n.shift(),f=r(m);s[m]="active",c.push(f);let g=u.get(m),v=[];g.leftId&&(n.push(g.leftId),v.push(`left ${r(g.leftId)}`)),g.rightId&&(n.push(g.rightId),v.push(`right ${r(g.rightId)}`)),s[m]="visited",l(`Level ${h}, i=${p}: pop node ${f} from the front, append it to currentList (now [${c.join(",")}]). ${v.length?`Enqueue its children (${v.join(", ")}) for the next level \u2192 queue ${e()}.`:"It has no children, nothing to enqueue."}`,v.length?34:32,{current:m,vars:[{name:"i",value:p},{name:"currentNode",value:f},{name:"currentList",value:"["+c.join(",")+"]",highlight:!0}]})}t.push(c),l(`Level ${h} finished \u2014 all ${d} node(s) processed. Append currentList [${c.join(",")}] to returnList \u2192 ${o()}. ${n.length?"The queue now holds the next level.":"The queue is empty."}`,38,{vars:[{name:"returnList",value:o(),highlight:!0}]}),h++}return ke.forEach(d=>s[d.id]="found"),l(`Queue is empty \u2014 BFS complete. Final level order = ${o()}.`,39,{vars:[{name:"result",value:o(),highlight:!0}]}),i}var Kt={id:"binary-tree-level-order-traversal",lcNumber:102,title:"Binary Tree Level Order Traversal",difficulty:"Medium",category:"trees",tags:["Tree","BFS","Queue"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",examples:[{input:"root = [3,9,20,null,null,15,7]",output:"[[3],[9,20],[15,7]]",explanation:"Level 0: [3]. Level 1: [9,20]. Level 2: [15,7]."}],constraints:["The number of nodes in the tree is in the range [0, 2000].","-1000 <= Node.val <= 1000"],hint:"Use BFS with a queue. At each iteration, record the current queue length \u2014 that tells you how many nodes are on the current level. Process exactly that many nodes, then move on to the next level.",solutions:[{label:"BFS (Queue)",pythonCode:jl,generateSteps:El}]};var Fl=`class TreeNode:
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        # While we can generate the BST with inorder DFS
        # it isn't the right way to find the answer
        # this is preorder DFS since the direction we go depends on the currentNode.val
        # since we are making a decision based on currentNode to go left or right, this is preorder
        currentNode = root

        while currentNode:
            # if both are smaller, we go left
            if p.val < currentNode.val and q.val < currentNode.val:
                currentNode = currentNode.left
            # if both are bigger, we go right
            elif p.val > currentNode.val and q.val > currentNode.val:
                currentNode = currentNode.right
            # if in separate sub-trees, it's currentNode
            else:
                return currentNode`,Qt=[{id:"n0",value:6,leftId:"n1",rightId:"n2"},{id:"n1",value:2,leftId:"n3",rightId:"n4"},{id:"n2",value:8,leftId:"n5",rightId:"n6"},{id:"n3",value:0,leftId:null,rightId:null},{id:"n4",value:4,leftId:null,rightId:null},{id:"n5",value:7,leftId:null,rightId:null},{id:"n6",value:9,leftId:null,rightId:null}];function Dl(){let i=[],u=new Map(Qt.map(l=>[l.id,l])),r=l=>u.get(l).value,s=2,n=4,t={n1:"highlighted",n4:"highlighted"},a=()=>Qt.map(l=>x(y({},l),{state:t[l.id]??"default"})),e=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:a(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 here"}]:[],counters:[{label:"p",value:s},{label:"q",value:n}]},variables:d.vars})};e(`We want the lowest common ancestor of p=${s} and q=${n}. We exploit the BST ordering instead of searching blindly: from the current node, if BOTH targets are smaller we go left, if BOTH are larger we go right. The instant they fall on different sides (or one equals the current node) we have found the split point \u2014 that node is the LCA. Start at the root.`,13,{vars:[{name:"p.val",value:s},{name:"q.val",value:n}]});let o="n0";for(;o;){let l=o,h=r(l);t[l]=t[l]==="highlighted"?"highlighted":"active";let d=u.get(l),c=s<h&&n<h,p=s>h&&n>h;if(c)e(`At node ${h}: is p (${s}) < ${h} AND q (${n}) < ${h}? Yes \u2014 both targets are in the LEFT subtree, so move left.`,18,{current:l,vars:[{name:"currentNode.val",value:h},{name:"p<node",value:"True"},{name:"q<node",value:"True",highlight:!0}]}),t[l]==="active"&&(t[l]="visited"),o=d.leftId;else if(p)e(`At node ${h}: both smaller? No. Is p (${s}) > ${h} AND q (${n}) > ${h}? Yes \u2014 both targets are in the RIGHT subtree, so move right.`,21,{current:l,vars:[{name:"currentNode.val",value:h},{name:"p>node",value:"True"},{name:"q>node",value:"True",highlight:!0}]}),t[l]==="active"&&(t[l]="visited"),o=d.rightId;else{t[l]="found",e(`At node ${h}: both smaller? No (p=${s} is not < ${h}). Both bigger? No. So p and q split here \u2014 one is on each side, or one equals this node. Node ${h} is the LCA. Return it.`,24,{current:l,vars:[{name:"currentNode.val",value:h},{name:"LCA",value:h,highlight:!0}]});break}}return i}var Jt={id:"lowest-common-ancestor-bst",lcNumber:235,title:"Lowest Common Ancestor of BST",difficulty:"Medium",category:"trees",tags:["Tree","DFS","BST"],timeComplexity:"O(h)",spaceComplexity:"O(1)",description:"Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST. The LCA is defined as the lowest node that has both p and q as descendants (a node can be a descendant of itself).",examples:[{input:"root = [6,2,8,0,4,7,9], p = 2, q = 4",output:"2",explanation:"Node 2 is the LCA since p=2 is node 2 itself and q=4 is in its right subtree."}],constraints:["The number of nodes in the tree is in the range [2, 10^5].","-10^9 <= Node.val <= 10^9","All Node.val are unique.","p != q, p and q will exist in the BST."],hint:"Use the BST property: if both p and q are less than current node, LCA is in the left subtree. If both are greater, go right. Otherwise, the current node is the LCA.",solutions:[{label:"Iterative BST Traversal",pythonCode:Fl,generateSteps:Dl}]};var Bl=`from collections import deque
import math
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        # valid BST means we need to compare current node's value to it's children or vice versa
        # let's do this with iterative DFS
        # we should keep track of what is allowed in current node
        # from the root, we allow everything, so lower bound of -inf and upper bound of inf
        # when we go left, the upper bound changes to root
        # when we go right, the lower bound changes to root

        stack = deque()
        stack.append([root,-math.inf, math.inf])

        while stack:
            currentNode, low, high = stack.pop()
            if not currentNode:
                continue

            # if current node not within bounds, return false
            # currentNode.val must be greater than low
            # currentNode.val must be less than high
            if currentNode.val <= low or currentNode.val >= high:
                return False

            # current node is valid, update boundaries to children and add to stack
            if currentNode.left:
                stack.append([currentNode.left, low, currentNode.val])
            if currentNode.right:
                stack.append([currentNode.right, currentNode.val, high])
        return True`,Se=[{id:"n0",value:5,leftId:"n1",rightId:"n2"},{id:"n1",value:3,leftId:"n3",rightId:"n4"},{id:"n2",value:6,leftId:null,rightId:"n5"},{id:"n3",value:2,leftId:null,rightId:null},{id:"n4",value:4,leftId:null,rightId:null},{id:"n5",value:7,leftId:null,rightId:null}];function Hl(){let i=[],u=new Map(Se.map(h=>[h.id,h])),r=h=>u.get(h).value,s=h=>h===-1/0?"\u2212\u221E":h===1/0?"+\u221E":String(h),n={},t=[["n0",-1/0,1/0]],a=()=>Se.map(h=>x(y({},h),{state:n[h.id]??"default"})),e=()=>"["+t.map(([h,d,c])=>`(${r(h)}: ${s(d)}<x<${s(c)})`).join(", ")+"]",o=(h,d,c={})=>{i.push({explanation:h,highlightLine:d,state:{type:"tree",nodes:a(),pointers:c.current?[{nodeId:c.current,label:"\u25B6 checking"}]:[],counters:[{label:"stack",value:e()}]},variables:c.vars})};o("A BST is valid if every node sits inside an allowed range. The trick: carry a (low, high) bound down the tree. Going LEFT tightens the upper bound to the parent; going RIGHT tightens the lower bound to the parent. We do this iteratively with a stack of (node, low, high). Push the root with the widest range (\u2212\u221E, +\u221E).",21,{vars:[{name:"stack",value:"[(5: \u2212\u221E<x<+\u221E)]"}]});let l=!0;for(;t.length;){let[h,d,c]=t.pop(),p=r(h);n[h]="active";let m=p>d&&p<c;if(o(`Pop node ${p} with allowed range (${s(d)}, ${s(c)}). Check ${s(d)} < ${p} < ${s(c)}? ${m?"Yes \u2713 \u2014 this node is valid so far.":`No \u2717 \u2014 ${p} violates its range, the tree is NOT a valid BST, return False.`}`,m?31:32,{current:h,vars:[{name:"node",value:p},{name:"low",value:s(d)},{name:"high",value:s(c)},{name:"in range?",value:m?"Yes":"No",highlight:!m}]}),!m){l=!1,n[h]="comparing";break}n[h]="visited";let f=u.get(h),g=[];f.leftId&&(t.push([f.leftId,d,p]),g.push(`left ${r(f.leftId)} gets range (${s(d)}, ${p})`)),f.rightId&&(t.push([f.rightId,p,c]),g.push(`right ${r(f.rightId)} gets range (${p}, ${s(c)})`)),g.length&&o(`Node ${p} valid. Push its children with tightened bounds: ${g.join("; ")}. Stack is now ${e()}.`,f.rightId?38:36,{current:h,vars:g.map((v,w)=>({name:`push ${w+1}`,value:v}))})}return l&&(Se.forEach(h=>n[h.id]="found"),o("Stack is empty and no node ever broke its range \u2014 the tree is a valid BST, return True.",39,{vars:[{name:"result",value:"True",highlight:!0}]})),i}var Zt={id:"validate-bst",lcNumber:98,title:"Validate Binary Search Tree",difficulty:"Medium",category:"trees",tags:["Tree","DFS","BST"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST requires that every node's left subtree contains only nodes with values strictly less than the node's value, and every node's right subtree contains only nodes with values strictly greater.",examples:[{input:"root = [5,3,6,2,4,null,7]",output:"true",explanation:"Each node satisfies strict BST constraints with tracked lower/upper bounds."}],constraints:["The number of nodes in the tree is in the range [1, 10^4].","-2^31 <= Node.val <= 2^31 - 1"],hint:"Use iterative DFS with a stack of (node, low, high) tuples. Start root with (-inf, inf). When going left, upper bound becomes current val; when going right, lower bound becomes current val.",solutions:[{label:"Iterative DFS with Bounds",pythonCode:Bl,generateSteps:Hl}]};var _l=`from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        # first thing that comes to mind is monotonic stack since we want all non-decreasing nodes
        # so we can do an iterative postorder dfs
        # then we can just use the stack and specifically just use that as a monotonic stack
        # However, monotonic stack is used normally for next biggest/smallest element
        # This also overcomplicates things. What we can do instead is use a tuple like in iterative max depth
        # this would keep track of node.val, currentMax
        # we need to keep track of currentMax to ensure we are still non-decreasing

        currentMax = root.val
        result = 0
        stack = deque()
        stack.append([root, currentMax])

        while stack:
            # if currentNode is not null, check if it is non-decreasing compared to the currentMax
            currentNode, currentMax = stack.pop()
            if currentNode:
                if currentNode.val >= currentMax:
                    result+=1
                    currentMax = max(currentMax, currentNode.val)
                # if smaller, we just don't include it and move on to the children
                stack.append([currentNode.left,currentMax])
                stack.append([currentNode.right,currentMax])

        return result`,ea=[{id:"n0",value:3,leftId:"n1",rightId:"n2"},{id:"n1",value:1,leftId:"n3",rightId:null},{id:"n2",value:4,leftId:"n4",rightId:"n5"},{id:"n3",value:3,leftId:null,rightId:null},{id:"n4",value:1,leftId:null,rightId:null},{id:"n5",value:5,leftId:null,rightId:null}];function Wl(){let i=[],u=new Map(ea.map(l=>[l.id,l])),r=l=>u.get(l).value,s={},n=0,t=[["n0",3]],a=()=>ea.map(l=>x(y({},l),{state:s[l.id]??"default"})),e=()=>"["+t.map(([l,h])=>`(${l?r(l):"\xF8"},max${h})`).join(", ")+"]",o=(l,h,d={})=>{i.push({explanation:l,highlightLine:h,state:{type:"tree",nodes:a(),pointers:d.current?[{nodeId:d.current,label:"\u25B6 popped"}]:[],counters:[{label:"result",value:n},{label:"stack",value:e()}]},variables:d.vars})};for(o('A node is "good" if no node on the path from the root to it is larger than it \u2014 i.e. its value \u2265 the max value seen so far on that path. We do an iterative DFS with an explicit stack holding (node, currentMax) pairs. currentMax travels DOWN each path so every node knows the biggest ancestor above it. Start by pushing (root 3, max 3).',22,{vars:[{name:"result",value:0},{name:"stack",value:"[(3,max3)]"}]});t.length;){let[l,h]=t.pop();if(o(`Pop (${l?r(l):"null"}, max ${h}) off the stack. ${l?"Node is non-null, so process it.":'Node is null \u2192 the "if currentNode" check is False, skip it entirely and loop again.'}`,27,{current:l,vars:[{name:"currentNode",value:l?r(l):"null"},{name:"currentMax",value:h}]}),!l)continue;let d=r(l),c=d>=h,p=Math.max(h,d);c&&(n+=1),s[l]=c?"found":"visited",o(`Node ${d} vs currentMax ${h}: ${d} ${c?`\u2265 ${h} \u2192 GOOD node, result becomes ${n} and currentMax updates to ${p} for this node's children.`:`< ${h} \u2192 NOT good (an ancestor was bigger). result stays ${n}.`}`,c?29:31,{current:l,vars:[{name:"node.val",value:d},{name:"currentMax",value:h},{name:"good?",value:c?"Yes":"No",highlight:c},{name:"result",value:n,highlight:c}]});let m=u.get(l);t.push([m.leftId,p]),t.push([m.rightId,p]);let f=m.leftId?r(m.leftId):"null",g=m.rightId?r(m.rightId):"null";o(`Push ${d}'s children with the updated max ${p}: left=${f}, right=${g}. (We push even null children \u2014 that's why each pop starts with an "is it null?" check.) Stack is now ${e()}.`,33,{current:l,vars:[{name:"pushed left",value:`(${f}, max${p})`},{name:"pushed right",value:`(${g}, max${p})`}]})}return o(`Stack is empty \u2014 every node has been processed. Good nodes found: root 3, node 4, node 5, and the leaf 3 (path 3\u21921\u21923, max 3, 3 \u2265 3). Total result = ${n}.`,35,{vars:[{name:"result",value:n,highlight:!0}]}),i}var ta={id:"count-good-nodes",lcNumber:1448,title:"Count Good Nodes in Binary Tree",difficulty:"Medium",category:"trees",tags:["Tree","DFS"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"Given a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X. Return the number of good nodes in the binary tree.",examples:[{input:"root = [3,1,4,3,null,1,5]",output:"4",explanation:"Good nodes: root(3), node 4, node 5, and the leaf node 3 (path 3\u21921\u21923, max=3, 3>=3)."}],constraints:["The number of nodes in the binary tree is in the range [1, 10^5].","Each node's value is between [-10, 10]."],hint:"Use iterative DFS with a stack of (node, currentMax) tuples. A node is good if its value >= currentMax on the path from root to that node.",solutions:[{label:"Iterative DFS",pythonCode:_l,generateSteps:Wl}]};var zl=`import collections
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        # if we do bfs, it's just the last element we see each time
        # so we'll just do that
        if not root:
            return []

        result = []

        queue = collections.deque()

        queue.append(root)

        while queue:
            # we want to put the last element of each level in the result
            # so we want to keep track of number of elements in each level
            numElementInLevel = len(queue)

            for i in range(numElementInLevel):
                currentNode = queue.popleft()
                # at last element, add to result
                if i == numElementInLevel - 1:
                    result.append(currentNode.val)
                if currentNode.left:
                    queue.append(currentNode.left)
                if currentNode.right:
                    queue.append(currentNode.right)

        return result`,aa=[{id:"n0",value:1,leftId:"n1",rightId:"n2"},{id:"n1",value:2,leftId:null,rightId:"n3"},{id:"n2",value:3,leftId:null,rightId:"n4"},{id:"n3",value:5,leftId:null,rightId:null},{id:"n4",value:4,leftId:null,rightId:null}];function Yl(){let i=[],u=new Map(aa.map(d=>[d.id,d])),r=d=>u.get(d).value,s={},n=["n0"],t=[],a=()=>aa.map(d=>x(y({},d),{state:s[d.id]??"default"})),e=()=>"["+n.map(d=>r(d)).join(", ")+"]",o=()=>"["+t.join(", ")+"]",l=(d,c,p={})=>{i.push({explanation:d,highlightLine:c,state:{type:"tree",nodes:a(),pointers:p.current?[{nodeId:p.current,label:"\u25B6 here"}]:[],counters:[{label:"queue",value:e()},{label:"result",value:o()}]},variables:p.vars})};l("Standing on the right, you see exactly the LAST node of each level (the rightmost one). So we BFS level by level, and within a level we only record the node at index i == numElementInLevel \u2212 1. Seed the queue with the root.",21,{vars:[{name:"queue",value:"[1]"},{name:"result",value:"[]"}]});let h=0;for(;n.length;){let d=n.length;l(`Level ${h}: snapshot numElementInLevel = ${d}. The visible node will be the one at i = ${d-1} (the last we pop this level).`,26,{vars:[{name:"numElementInLevel",value:d,highlight:!0}]});for(let c=0;c<d;c++){let p=n.shift(),m=r(p),f=c===d-1;s[p]="active",f?(t.push(m),s[p]="found"):s[p]="visited";let g=u.get(p),v=[];g.leftId&&(n.push(g.leftId),v.push(`left ${r(g.leftId)}`)),g.rightId&&(n.push(g.rightId),v.push(`right ${r(g.rightId)}`)),l(`Level ${h}, i=${c}: pop node ${m}. Is i (${c}) == numElementInLevel\u22121 (${d-1})? ${f?`Yes \u2192 it's the rightmost on this level, append ${m} to result \u2192 ${o()}.`:"No \u2192 not the rightmost, don't record it."} ${v.length?`Enqueue its children (${v.join(", ")}) \u2192 queue ${e()}.`:"No children to enqueue."}`,f?32:29,{current:p,vars:[{name:"i",value:c},{name:"currentNode",value:m},{name:"last in level?",value:f?"Yes":"No",highlight:f},{name:"result",value:o(),highlight:f}]})}h++}return l(`Queue empty \u2014 done. The rightmost node at each depth, top to bottom, is ${o()}.`,38,{vars:[{name:"result",value:o(),highlight:!0}]}),i}var na={id:"binary-tree-right-side-view",lcNumber:199,title:"Binary Tree Right Side View",difficulty:"Medium",category:"trees",tags:["Tree","BFS","Queue","DFS"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given the root of a binary tree, imagine yourself standing on the right side of it. Return the values of the nodes you can see ordered from top to bottom.",examples:[{input:"root = [1,2,3,null,5,null,4]",output:"[1,3,4]",explanation:"From the right, you see node 1 (depth 0), node 3 (depth 1, rightmost), node 4 (depth 2, rightmost)."},{input:"root = [1,null,3]",output:"[1,3]"}],constraints:["The number of nodes in the tree is in the range [0, 100].","-100 <= Node.val <= 100"],hint:"BFS level by level. At each level, track how many nodes are in the queue (numElementInLevel). Only the node processed at i == numElementInLevel - 1 is visible from the right \u2014 add it to the result.",solutions:[{label:"BFS (level-by-level, take last of each level)",pythonCode:zl,generateSteps:Yl}]};var Gl=`import heapq

class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        # go through the list and heapify the array as a max heap
        # pop twice to smash, if diff is not zero, insert diff into heap
        # continue until we are left with heap of size 1 or less

        maxHeap = []

        for stone in stones:
            # must push negative since python heap is minHeap by default
            heapq.heappush(maxHeap, -stone)

        # we want to stop the loop when we only have 1 stone or 0 stone left
        while len(maxHeap) > 1:
            firstStone = -heapq.heappop(maxHeap)
            secondStone = 0
            if len(maxHeap) > 0:
                secondStone = -heapq.heappop(maxHeap)
            diff = firstStone - secondStone
            if diff != 0:
                heapq.heappush(maxHeap, -diff)

        if len(maxHeap) == 1:
            return -maxHeap[0]
        return 0`;function Vl(){let i=[2,7,4,1,8,1],u=[],r=[...i].sort((t,a)=>a-t),s=(t,a=[])=>({type:"array",cells:r.map((e,o)=>({value:e,state:t.includes(o)?"active":a.includes(o)?"found":"default"})),pointers:[],counters:[{label:"heap size",value:r.length}]});for(u.push({explanation:`Heapify the stones into a max-heap so the two heaviest are always on top. (Python's heapq is a min-heap, so it pushes \u2212stone; we show the conceptual max-heap as a descending list.) maxHeap = [${r.join(", ")}].`,highlightLine:10,state:s([]),variables:[{name:"stones",value:`[${i.join(", ")}]`},{name:"maxHeap",value:`[${r.join(", ")}]`}]});r.length>1;){let t=r[0],a=r[1];u.push({explanation:`Pop the two heaviest stones: y=${t} and x=${a}. Smash them together.`,highlightLine:17,state:s([0,1]),variables:[{name:"firstStone (y)",value:t,highlight:!0},{name:"secondStone (x)",value:a,highlight:!0}]}),r=r.slice(2);let e=t-a;e!==0?(r.push(e),r.sort((o,l)=>l-o),u.push({explanation:`${t} \u2212 ${a} = ${e} \u2260 0 \u2192 the heavier stone survives with weight ${e}. Push ${e} back into the heap \u2192 [${r.join(", ")}].`,highlightLine:23,state:s([r.indexOf(e)]),variables:[{name:"diff",value:e,highlight:!0},{name:"maxHeap",value:`[${r.join(", ")}]`}]})):u.push({explanation:`${t} \u2212 ${a} = 0 \u2192 equal weights, both stones are destroyed. Nothing pushed back \u2192 [${r.join(", ")}].`,highlightLine:22,state:s([]),variables:[{name:"diff",value:0},{name:"maxHeap",value:`[${r.join(", ")}]`}]})}let n=r.length===1?r[0]:0;return u.push({explanation:`Heap has ${r.length} stone(s) left. Return ${n}. Each smash is O(log n) (heap push/pop) and there are O(n) smashes \u2192 O(n log n).`,highlightLine:r.length===1?26:27,state:{type:"array",cells:r.map(t=>({value:t,state:"found"})),pointers:[],counters:[{label:"result",value:n}]},variables:[{name:"return",value:n,highlight:!0}]}),u}var Ul={label:"Max-Heap",pythonCode:Gl,generateSteps:Vl,timeComplexity:"O(n log n)",spaceComplexity:"O(n)"},ia={id:"last-stone-weight",lcNumber:1046,title:"Last Stone Weight",difficulty:"Easy",category:"heap",tags:["Heap","Priority Queue","Array"],timeComplexity:"O(n log n)",spaceComplexity:"O(n)",description:"You are given an array of stones where stones[i] is the weight of the ith stone. Each turn, smash the two heaviest stones together: if equal, both are destroyed; otherwise the lighter is destroyed and the heavier becomes their difference. Return the weight of the last remaining stone, or 0 if none remain.",examples:[{input:"stones = [2,7,4,1,8,1]",output:"1",explanation:"Smash 8&7\u21921 \u2192 [2,4,1,1,1]; 4&2\u21922 \u2192 [2,1,1,1]; 2&1\u21921 \u2192 [1,1,1]; 1&1\u21920 \u2192 [1]. Last stone = 1."},{input:"stones = [1]",output:"1"}],constraints:["1 \u2264 stones.length \u2264 30","1 \u2264 stones[i] \u2264 1000"],hint:"You repeatedly need the two largest elements. What data structure gives you the max in O(log n) per removal? Use a max-heap; push the difference back when the two heaviest differ.",solutions:[Ul]};var Xl=`import heapq
import math

class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:

        def euclideanDistance(origin, destination):
            x1, y1 = origin[0], origin[1]
            x2, y2 = destination[0], destination[1]

            return math.sqrt(((x2 - x1)**2 + (y2 - y1)**2))

        # we want the kth smallest so that means we should have a max heap
        # a max heap of size k
        # we need to store distance -> (x,y) in the heap

        maxHeap = []

        for x, y in points:
            dist = euclideanDistance((x,y),(0,0))
            heapq.heappush(maxHeap, (-dist,(x,y)))
            while len(maxHeap) > k:
                heapq.heappop(maxHeap)

        result = []

        while maxHeap:
            currentCoordinate = heapq.heappop(maxHeap)[1]
            result.append((currentCoordinate[0],currentCoordinate[1]))

        return result`;function Kl(){let i=[[3,3],[5,-1],[-2,4]],u=2,r=[],s=d=>d[0]*d[0]+d[1]*d[1],n=d=>Math.sqrt(s(d)).toFixed(2),t=d=>`(${d[0]},${d[1]})`,a=[],e=d=>a.some(c=>c[0]===d[0]&&c[1]===d[1]),o=()=>a.length?a.map(d=>`${t(d)}:d=${n(d)}`).join(", "):"\u2205",l=d=>({type:"array",cells:i.map((c,p)=>({value:t(c),state:p===d?"active":e(c)?"window":"default"})),pointers:d!==null?[{index:d,label:"point"}]:[],counters:[{label:"k",value:u},{label:"maxHeap (farthest on top)",value:o()}]});r.push({explanation:"Keep a MAX-heap of size k, keyed by distance from the origin. The farthest of the current k sits on top, so when a closer point arrives we evict the farthest. What survives is the k closest. (Python pushes (\u2212dist, point) into a min-heap to mimic a max-heap.)",highlightLine:13,state:l(null),variables:[{name:"k",value:u},{name:"points",value:i.map(t).join(", ")}]});for(let d=0;d<i.length;d++){let c=i[d];if(a.push(c),a.sort((p,m)=>s(m)-s(p)),r.push({explanation:`Point ${t(c)}: distance = \u221A(${c[0]}\xB2 + ${c[1]}\xB2) = ${n(c)}. Push it onto the heap (size ${a.length}).`,highlightLine:21,state:l(d),variables:[{name:"point",value:t(c),highlight:!0},{name:"dist",value:n(c)},{name:"heap size",value:a.length}]}),a.length>u){let p=a[0];a=a.slice(1),r.push({explanation:`Heap size ${a.length+1} > k=${u} \u2192 pop the farthest: ${t(p)} (d=${n(p)}). It can't be among the ${u} closest, so discard it.`,highlightLine:23,state:l(null),variables:[{name:"evicted",value:t(p),highlight:!0},{name:"heap size",value:a.length}]})}}let h=a.map(t);return r.push({explanation:`Heap now holds the ${u} closest points: ${a.map(d=>`${t(d)}(d=${n(d)})`).join(", ")}. Pop them into the result \u2192 [${h.join(", ")}]. O(n log k) time, O(k) space.`,highlightLine:31,state:{type:"array",cells:i.map(d=>({value:t(d),state:e(d)?"found":"eliminated"})),pointers:[],counters:[{label:"result",value:`[${h.join(", ")}]`}]},variables:[{name:"return",value:`[${h.join(", ")}]`,highlight:!0}]}),r}var Ql={label:"Max-Heap (size k)",pythonCode:Xl,generateSteps:Kl,timeComplexity:"O(n log k)",spaceComplexity:"O(k)"},sa={id:"k-closest-points-to-origin",lcNumber:973,title:"K Closest Points to Origin",difficulty:"Medium",category:"heap",tags:["Heap","Priority Queue","Math","Sorting"],timeComplexity:"O(n log k)",spaceComplexity:"O(k)",description:"Given an array of points on the X-Y plane and an integer k, return the k closest points to the origin (0, 0), measured by Euclidean distance. The answer may be returned in any order.",examples:[{input:"points = [[1,3],[-2,2]], k = 1",output:"[[-2,2]]",explanation:"\u221A8 < \u221A10, so (-2,2) is closer."},{input:"points = [[3,3],[5,-1],[-2,4]], k = 2",output:"[[3,3],[-2,4]]"}],constraints:["1 \u2264 k \u2264 points.length \u2264 10\u2074","-10\u2074 \u2264 xi, yi \u2264 10\u2074"],hint:"Compare points by distance from the origin (you can skip the square root and compare x\xB2+y\xB2). A size-k max-heap keeps the k smallest distances: when it overflows, pop the largest. O(n log k).",solutions:[Ql]};var Jl=`import heapq

class KthLargest:

    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap = []
        # heap by default is minheap so what we should do is create a minheap
        # of size k so that the smallest value is our return value
        for n in nums:
            heapq.heappush(self.heap,n)
            while len(self.heap) > self.k:
                heapq.heappop(self.heap)

    def add(self, val: int) -> int:
        # adds a value to nums and returns kth largest
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]`;function Zl(){let u=[4,5,8,2],r=[3,5,10,9,4],s=[],n=[],t=a=>({type:"array",cells:n.map((e,o)=>({value:e,state:o===0?"min-ptr":a.includes(o)?"active":"default"})),pointers:n.length?[{index:0,label:"kth largest"}]:[],counters:[{label:"k",value:3},{label:"minHeap (kth-largest on top)",value:n.length?`[${n.join(", ")}]`:"\u2205"}]});s.push({explanation:`Keep a MIN-heap of the k largest values seen so far. Its smallest element \u2014 the top \u2014 is exactly the kth largest. Whenever the heap grows past size k, pop the smallest. Constructor: KthLargest(k=3, [${u.join(", ")}]).`,highlightLine:8,state:t([]),variables:[{name:"k",value:3},{name:"nums",value:`[${u.join(", ")}]`}]});for(let a of u)if(n.push(a),n.sort((e,o)=>e-o),s.push({explanation:`Constructor: push ${a} \u2192 [${n.join(", ")}] (size ${n.length}).`,highlightLine:11,state:t([n.indexOf(a)]),variables:[{name:"pushed",value:a,highlight:!0},{name:"size",value:n.length}]}),n.length>3){let e=n[0];n=n.slice(1),s.push({explanation:`Size ${n.length+1} > k=3 \u2192 pop the smallest (${e}); it's not in the top 3. \u2192 [${n.join(", ")}].`,highlightLine:13,state:t([]),variables:[{name:"popped",value:e,highlight:!0},{name:"size",value:n.length}]})}s.push({explanation:`Constructor done. minHeap = [${n.join(", ")}]; the top (${n[0]}) is the 3th largest so far.`,highlightLine:13,state:t([0]),variables:[{name:"kth largest",value:n[0],highlight:!0}]});for(let a of r){if(n.push(a),n.sort((e,o)=>e-o),s.push({explanation:`add(${a}): push ${a} \u2192 [${n.join(", ")}] (size ${n.length}).`,highlightLine:17,state:t([n.indexOf(a)]),variables:[{name:"val",value:a,highlight:!0},{name:"size",value:n.length}]}),n.length>3){let e=n[0];n=n.slice(1),s.push({explanation:`Size ${n.length+1} > k=3 \u2192 pop the smallest (${e}) \u2192 [${n.join(", ")}].`,highlightLine:19,state:t([]),variables:[{name:"popped",value:e},{name:"size",value:n.length}]})}s.push({explanation:`Return heap[0] = ${n[0]} \u2014 the 3th largest after adding ${a}.`,highlightLine:20,state:t([0]),variables:[{name:"return",value:n[0],highlight:!0}]})}return s}var eo={label:"Min-Heap (size k)",pythonCode:Jl,generateSteps:Zl,timeComplexity:"O(log k) per add",spaceComplexity:"O(k)"},ra={id:"kth-largest-element-in-stream",lcNumber:703,title:"Kth Largest Element in a Stream",difficulty:"Easy",category:"heap",tags:["Heap","Priority Queue","Design","Stream"],timeComplexity:"O(log k) per add",spaceComplexity:"O(k)",description:"Design a class that, given an integer k and a stream of values, returns the kth largest element after each new value is added. (The kth largest in the sorted order of all values so far, with duplicates counted.)",examples:[{input:"KthLargest(3, [4,5,8,2]); add(3),add(5),add(10),add(9),add(4)",output:"[4, 5, 5, 8, 8]",explanation:"A size-3 min-heap keeps the 3 largest; its top is the 3rd largest after each add."}],constraints:["0 \u2264 nums.length \u2264 10\u2074","1 \u2264 k \u2264 nums.length + 1","-10\u2074 \u2264 nums[i], val \u2264 10\u2074","At most 10\u2074 calls to add"],hint:"You don't need all the values sorted \u2014 only the kth largest. Keep a min-heap capped at size k: the k largest values stay in it, and the smallest of those (the heap top) is your answer. Each add is O(log k).",solutions:[eo]};var to=`import collections
import heapq

class Twitter:

    def __init__(self):
        # globalTweetCount to keep track of heap
        self.globalTweetCount = 0
        # person -> followee
        self.followMap = collections.defaultdict(list)
        # person -> (globalTweetCount, tweet)
        self.tweetMap = collections.defaultdict(list)

    def postTweet(self, userId: int, tweetId: int) -> None:
        # add to tweet map
        self.tweetMap[userId].append((self.globalTweetCount, tweetId))
        self.globalTweetCount+=1

    def getNewsFeed(self, userId: int) -> List[int]:
        result = []
        heap = []

        # build a heap with all the values in tweetMap that this user follows
        # or the user himself

        relevantUsers = set(self.followMap[userId]) | {userId}

        for user in relevantUsers:
            for timestamp, tweetId in self.tweetMap[user]:
                # timestamp goes up, so we need to negate it to get latest
                heapq.heappush(heap, (-timestamp, tweetId))

        # now we get 10 or until heap
        while heap and len(result) < 10:
            currentFeed = heapq.heappop(heap)
            result.append(currentFeed[1])
        return result

    def follow(self, followerId: int, followeeId: int) -> None:
        self.followMap[followerId].append(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        if followeeId in self.followMap[followerId]:
            self.followMap[followerId].remove(followeeId)`;function ao(){let i=[],u=0,r={},s={},n=()=>Object.fromEntries(Object.entries(s).map(([l,h])=>[`u${l}`,h.length?h.map(([d,c])=>`${c}@t${d}`).join(", "):"\u2205"])),t=()=>Object.fromEntries(Object.entries(r).map(([l,h])=>[`u${l}`,h.length?h.map(d=>`u${d}`).join(", "):"\u2205"])),a=(l,h,d,c,p)=>({explanation:"",highlightLine:h,state:{type:"array",cells:d.map(m=>({value:m,state:"found"})),pointers:[],hashmap:n(),hashmapLabel:"tweetMap (user \u2192 tweetId@time)",hashmap2:t(),hashmap2Label:"followMap (user \u2192 follows)",stackItems:c.map(([m,f])=>`${f}@t${m}`),counters:[{label:"op",value:l},{label:"globalTweetCount",value:u},...p!==void 0?[{label:"returns",value:p}]:[]]},variables:[]}),e=(l,h,d)=>{l.explanation=h,l.variables=d,i.push(l)};return e(a("Twitter()",8,[],[]),"Construct Twitter: globalTweetCount = 0 (a monotonic clock so newer tweets get a higher timestamp), followMap (user \u2192 who they follow) and tweetMap (user \u2192 their tweets as (timestamp, tweetId)) both empty.",[{name:"globalTweetCount",value:0}]),(s[1]||=[]).push([u,5]),u++,e(a("postTweet(1, 5)",16,[],[]),"postTweet(1, 5): append (timestamp=0, tweetId=5) to user 1\u2019s tweets, then bump globalTweetCount \u2192 1. The timestamp records ordering so the feed can sort by recency.",[{name:"tweetMap[1]",value:"[(0,5)]",highlight:!0},{name:"globalTweetCount",value:1}]),o(1,"getNewsFeed(1)"),(r[1]||=[]).push(2),e(a("follow(1, 2)",40,[],[]),"follow(1, 2): append 2 to user 1\u2019s followMap. User 1 will now see user 2\u2019s tweets in their feed.",[{name:"followMap[1]",value:"[2]",highlight:!0}]),(s[2]||=[]).push([u,6]),u++,e(a("postTweet(2, 6)",16,[],[]),"postTweet(2, 6): append (timestamp=1, tweetId=6) to user 2\u2019s tweets; globalTweetCount \u2192 2. Note 6 has a higher timestamp than 5, so it\u2019s newer.",[{name:"tweetMap[2]",value:"[(1,6)]",highlight:!0},{name:"globalTweetCount",value:2}]),o(1,"getNewsFeed(1)"),r[1]=(r[1]||[]).filter(l=>l!==2),e(a("unfollow(1, 2)",44,[],[]),"unfollow(1, 2): remove 2 from user 1\u2019s followMap. User 2\u2019s tweets will no longer appear in user 1\u2019s feed.",[{name:"followMap[1]",value:"[]",highlight:!0}]),o(1,"getNewsFeed(1)"),i;function o(l,h){let d=[...new Set([l,...r[l]||[]])];e(a(h,26,[],[]),`${h}: relevantUsers = the people user ${l} follows \u222A {${l}} = {${d.map(m=>`u${m}`).join(", ")}}. We merge their tweets to find the 10 most recent.`,[{name:"relevantUsers",value:`{${d.map(m=>`u${m}`).join(", ")}}`,highlight:!0}]);let c=[];for(let m of d)for(let[f,g]of s[m]||[])c.push([f,g]),c.sort((v,w)=>w[0]-v[0]),e(a(h,31,[],c),`Push user ${m}'s tweet ${g} (timestamp ${f}) onto the heap. (Python pushes (\u2212timestamp, id) into a min-heap so the newest pops first.)`,[{name:"pushed",value:`${g}@t${f}`,highlight:!0},{name:"heap size",value:c.length}]);let p=[];for(;c.length&&p.length<10;){let[m,f]=c.shift();p.push(f),e(a(h,35,p,c),`Pop the newest tweet: ${f} (timestamp ${m}). Append to feed \u2192 [${p.join(", ")}].`,[{name:"popped",value:`${f}@t${m}`,highlight:!0},{name:"feed",value:`[${p.join(", ")}]`}])}e(a(h,37,p,[],`[${p.join(", ")}]`),`Heap drained (or 10 reached). ${h} returns [${p.join(", ")}] \u2014 most recent first.`,[{name:"return",value:`[${p.join(", ")}]`,highlight:!0}])}}var no={label:"Hash Maps + Heap-Merged Feed",pythonCode:to,generateSteps:ao,timeComplexity:"getNewsFeed O(t log t)",spaceComplexity:"O(users + tweets)"},la={id:"design-twitter",lcNumber:355,title:"Design Twitter",difficulty:"Medium",category:"heap",tags:["Heap","Priority Queue","Hash Map","Design"],timeComplexity:"getNewsFeed O(t log t)",spaceComplexity:"O(users + tweets)",description:"Design a simplified Twitter: users can postTweet, follow/unfollow other users, and getNewsFeed \u2014 the 10 most recent tweet IDs from the user and everyone they follow, newest first.",examples:[{input:"postTweet(1,5); getNewsFeed(1); follow(1,2); postTweet(2,6); getNewsFeed(1); unfollow(1,2); getNewsFeed(1)",output:"[5], [6,5], [5]",explanation:"A global timestamp orders tweets; a heap merges the relevant users\u2019 tweets to pull the 10 newest."}],constraints:["1 \u2264 userId, followerId, followeeId \u2264 500","0 \u2264 tweetId \u2264 10\u2074","All tweets have unique IDs","At most 3 \xD7 10\u2074 calls across all methods","A user cannot follow themselves"],hint:"Store each tweet with a global, increasing timestamp (user \u2192 list of (time, tweetId)). For the feed, collect tweets from the user + everyone they follow and use a heap to pull the 10 with the largest timestamps.",solutions:[no]};var io=`class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        # first thing that comes to mind for subarray sum is prefixSum
        # we are looking for # of times prefix[j] - prefix[i] = k
        # but if we go through the prefixSum looking for i and j, we will end up with O(n^2)
        # so what can we do reduce the time complexity
        # we can take an approach like two sum
        # prefix[i] = prefix[j] - k
        # prefix[i] is sum we already calculated before
        # prefix[j] is current sum
        # so if prefix[i] is in the map, we increment our solution counter

        # map to store number of times prefix[i] appeared
        # we do need to consider if prefix[j] = k, then prefix[i] = 0
        # so we need to store it in the map first. e.g. nums = [3], k = 3
        prefixSumMap = {}
        prefixSumMap[0] = 1
        result = 0
        runningSum = 0

        for j in range(len(nums)):
            runningSum += nums[j]
            prefix_i = runningSum - k
            if prefix_i in prefixSumMap:
                result+=prefixSumMap[prefix_i]
            # since we just saw runningSum, we store it in the map
            prefixSumMap[runningSum] = prefixSumMap.get(runningSum,0) + 1

        return result`;function so(){let i=[1,2,3],u=3,r=[],s={0:1},n=0,t=0,a=e=>({type:"array",cells:i.map((o,l)=>({value:o,state:l===e?"active":l<(e??0)?"visited":"default"})),pointers:e!==null?[{index:e,label:"j"}]:[],hashmap:y({},s),hashmapLabel:"prefixSumMap (sum\u2192count)",counters:[{label:"runningSum",value:t},{label:"result",value:n},{label:"k",value:u}]});r.push({explanation:`Count subarrays summing to k=${u}. Trick (like Two Sum on prefix sums): a subarray (i, j] sums to k iff runningSum[j] \u2212 runningSum[i] = k, i.e. runningSum \u2212 k was a prefix we've seen. Store counts of each prefix sum in a map; seed it with {0: 1} so a prefix that itself equals k is counted.`,highlightLine:16,state:a(null),variables:[{name:"prefixSumMap",value:"{0: 1}"},{name:"result",value:0},{name:"runningSum",value:0}]});for(let e=0;e<i.length;e++){t+=i[e];let o=t-u,l=s[o]||0;l&&(n+=l),r.push({explanation:`j=${e}: runningSum += ${i[e]} \u2192 ${t}. We need a prior prefix of runningSum \u2212 k = ${t} \u2212 ${u} = ${o}. ${l?`prefixSumMap has ${o} (\xD7${l}) \u2192 result += ${l} \u2192 ${n}.`:`${o} not in the map \u2192 no new subarray here.`}`,highlightLine:l?25:24,state:a(e),variables:[{name:"j",value:e},{name:"runningSum",value:t,highlight:!0},{name:"prefix_i (need)",value:o,highlight:!0},{name:"found count",value:l,highlight:l>0},{name:"result",value:n,highlight:l>0}]}),s[t]=(s[t]||0)+1,r.push({explanation:`Record this prefix: prefixSumMap[${t}] \u2192 ${s[t]}. A future index can now use it as its "prefix_i".`,highlightLine:27,state:a(e),variables:[{name:`prefixSumMap[${t}]`,value:s[t],highlight:!0}]})}return r.push({explanation:`All indices processed. ${n} subarray(s) sum to ${u} ([1,2] and [3]). Return ${n}. One pass, O(n) time and O(n) space \u2014 the map turns the O(n\xB2) prefix-pair search into O(1) lookups.`,highlightLine:29,state:{type:"array",cells:i.map(e=>({value:e,state:"found"})),pointers:[],hashmap:y({},s),hashmapLabel:"prefixSumMap (sum\u2192count)",counters:[{label:"result",value:n}]},variables:[{name:"return",value:n,highlight:!0}]}),r}var ro={label:"Prefix Sum + Hash Map",pythonCode:io,generateSteps:so,timeComplexity:"O(n)",spaceComplexity:"O(n)"},oa={id:"subarray-sum-equals-k",lcNumber:560,title:"Subarray Sum Equals K",difficulty:"Medium",category:"arrays-hash",tags:["Array","Hash Map","Prefix Sum"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given an integer array nums and an integer k, return the total number of contiguous subarrays whose sum equals k.",examples:[{input:"nums = [1,1,1], k = 2",output:"2"},{input:"nums = [1,2,3], k = 3",output:"2",explanation:"Subarrays [1,2] and [3]."}],constraints:["1 \u2264 nums.length \u2264 2 \xD7 10\u2074","-1000 \u2264 nums[i] \u2264 1000","-10\u2077 \u2264 k \u2264 10\u2077"],hint:'A subarray sum is a difference of two prefix sums. As you sweep, ask "have I seen a prefix equal to runningSum \u2212 k?" \u2014 count occurrences of each prefix sum in a hash map (seeded with {0:1}) so each lookup is O(1).',solutions:[ro]};var lo=`class Solution:
    # this problem is the basis of Length Prefix Framing for transmitting over networks
    # we provide a length and a delimiter in front of the string so we don't read the string itself
    # and just provide based on the length in front

    def encode(self, strs: List[str]) -> str:
        transmissionString = ""
        for string in strs:
            lenPrefix = len(string)
            lenPrefixFrame = str(lenPrefix) + "#" + string
            transmissionString+=lenPrefixFrame
        return transmissionString

    def decode(self, s: str) -> List[str]:
        # to decode, we want to read the len in front and then take that length into result
        # first thought is to do a split on # and get the first part of the split
        # but doing this for the entire string would give us O(n^2)
        # so we will do it manually using pointers
        # need two pointers, one to track start, one to track end of word
        result = []

        i = 0

        while i < len(s):
            j = i
            while s[j] != '#':
                j+=1
            # now we know i -> j is the length
            lenStr = int(s[i:j])
            # now the word is from j+1 -> j+1+lenStr
            word = s[j+1:j+1+lenStr]
            result.append(word)
            i=j+1+lenStr
        return result`,oo=["Hello","World"];function uo(){let i=[];i.push({explanation:'The hard part is separating strings when any character (including "#" or digits) may appear inside them. Solution: length-prefix framing. Prefix each string with its length and a "#". On decode we read the number, then take exactly that many characters \u2014 a "#" inside the body can never confuse us.',highlightLine:6,state:{type:"array",cells:[],pointers:[],arrayLabel:"encoded string"},variables:[{name:"strs",value:'["Hello", "World"]'},{name:"transmissionString",value:'""'}]});let u="";for(let a of oo){let e=`${a.length}#${a}`,o=u.length;u+=e,i.push({explanation:`Encode "${a}": lenPrefix = len("${a}") = ${a.length}, so lenPrefixFrame = "${a.length}#${a}". Append it. The "${a.length}#" prefix tells the decoder exactly how many characters of body follow.`,highlightLine:11,state:{type:"array",cells:u.split("").map((l,h)=>({value:l,state:h>=o?"found":"visited"})),pointers:[],arrayLabel:"transmissionString (building)"},variables:[{name:"string",value:`"${a}"`,highlight:!0},{name:"lenPrefixFrame",value:`"${e}"`,highlight:!0},{name:"transmissionString",value:`"${u}"`}]})}i.push({explanation:`Encoding done: "${u}". This single string is sent over the wire; the receiver decodes it back into ["Hello", "World"] using two pointers \u2014 i marks the start of a frame, j scans to its "#".`,highlightLine:13,state:{type:"array",cells:u.split("").map(a=>({value:a,state:"default"})),pointers:[],arrayLabel:"transmissionString (to decode)"},variables:[{name:"encoded",value:`"${u}"`,highlight:!0}]});let r=u.split(""),s=[],n=(a,e,o,l)=>r.map((h,d)=>{let c="default";return d<a?c="visited":d>=a&&d<e?c="window":d===e&&e<r.length?c="active":d>=o&&d<l&&(c="found"),{value:h,state:c}}),t=0;for(;t<r.length;){let a=t;for(;r[a]!=="#";)a++;let e=parseInt(u.slice(t,a),10),o=a+1,l=a+1+e,h=u.slice(o,l);i.push({explanation:`i=${t}: set j=i and advance j while s[j] != "#". It stops at index ${a} (the "#"). The digits between i and j spell "${u.slice(t,a)}", so lenStr = int(s[${t}:${a}]) = ${e}.`,highlightLine:28,state:{type:"array",cells:n(t,a,-1,-1),pointers:[{index:t,label:"i"},{index:a,label:"j (#)"}],arrayLabel:"transmissionString (decoding)"},variables:[{name:"i",value:t,highlight:!0},{name:"j",value:a,highlight:!0},{name:"lenStr",value:e,highlight:!0}]}),s.push(h),i.push({explanation:`The word is the ${e} characters after "#": word = s[${o}:${l}] = "${h}". Append it to result, then jump i to j+1+lenStr = ${l} to start the next frame.`,highlightLine:34,state:{type:"array",cells:n(t,a,o,l),pointers:[{index:o,label:"word start"},{index:l-1,label:"word end"}],arrayLabel:"transmissionString (decoding)"},variables:[{name:"word",value:`"${h}"`,highlight:!0},{name:"result",value:`[${s.map(d=>`"${d}"`).join(", ")}]`},{name:"next i",value:l}]}),t=l}return i.push({explanation:`i reached the end of the string \u2014 the while loop ends. Return [${s.map(a=>`"${a}"`).join(", ")}], exactly the original list. Both encode and decode are O(total length): each character is touched a constant number of times (the two-pointer scan avoids the O(n\xB2) of repeated split()).`,highlightLine:36,state:{type:"array",cells:r.map(a=>({value:a,state:"visited"})),pointers:[],arrayLabel:"transmissionString (decoded)",counters:[{label:"decoded",value:`[${s.map(a=>`"${a}"`).join(", ")}]`}]},variables:[{name:"result",value:`[${s.map(a=>`"${a}"`).join(", ")}]`,highlight:!0}]}),i}var ho={label:"Length Prefix (two-pointer decode)",pythonCode:lo,generateSteps:uo,timeComplexity:"O(n)",spaceComplexity:"O(n)"},ua={id:"encode-and-decode-strings",lcNumber:271,title:"Encode and Decode Strings",difficulty:"Medium",category:"arrays-hash",tags:["Array","String","Design"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Design an algorithm to encode a list of strings into a single string, transmit it, and decode it back into the original list. The encoding must survive any characters \u2014 including delimiters and digits \u2014 appearing inside the strings.",examples:[{input:'strs = ["Hello","World"]',output:'["Hello","World"]'},{input:'strs = [""]',output:'[""]',explanation:'Encodes to "0#" and decodes back to a single empty string.'}],constraints:["0 \u2264 strs.length < 100","0 \u2264 strs[i].length < 200","strs[i] may contain any of the 256 ASCII characters."],hint:'A plain delimiter fails because the delimiter could appear inside a string. Prefix each string with its length followed by a separator ("5#Hello"). On decode, read the length, then slice exactly that many characters \u2014 the body is never scanned for delimiters.',solutions:[ho]};var co=`class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        # slightly cleaner version of linked list arithmetic
        # since the above literally just does 3 loops with the same code
        l1t = l1
        l2t = l2
        carryover = 0
        dummyResultNode = ListNode(-1)
        dummyTraversal = dummyResultNode

        while l1t or l2t or carryover:
            l1tVal = l2tVal = 0
            if l1t:
                l1tVal = l1t.val
            if l2t:
                l2tVal = l2t.val
            digitSum = l1tVal + l2tVal + carryover
            if digitSum >= 10:
                carryover = 1
            else:
                carryover = 0
            resultNode = ListNode(digitSum%10)
            dummyTraversal.next = resultNode
            dummyTraversal = dummyTraversal.next
            if l1t:
                l1t = l1t.next
            if l2t:
                l2t = l2t.next

        return dummyResultNode.next`,U=[2,4,3],X=[5,6,4];function Le(i,u){let r=U.map((n,t)=>({id:`a${t}`,value:n,nextId:t<U.length-1?`a${t+1}`:null,state:i===t?"curr":i!==null&&t<i?"done":"default"})),s=X.map((n,t)=>({id:`b${t}`,value:n,nextId:t<X.length-1?`b${t+1}`:null,state:u===t?"prev":u!==null&&t<u?"done":"default"}));return[...r,...s]}function ha(i,u){return i.map((r,s)=>({id:`r${s}`,value:r,nextId:s<i.length-1?`r${s+1}`:null,state:s===u?"active":"done"}))}function po(){let i=[],u=[],r=0,s=0,n=0;for(i.push({explanation:"Add 342 + 465 = 807. Digits are stored least-significant-first (2\u21924\u21923 is 342), which is exactly the order we add by hand: rightmost digit first, carrying overflow left. A dummy head simplifies building the result, and the loop runs while either list has nodes left OR a carry remains.",highlightLine:9,state:{type:"linked-list",nodes:Le(0,0),pointers:[{nodeId:"a0",label:"l1t"},{nodeId:"b0",label:"l2t"}],result:[]},variables:[{name:"l1",value:"2\u21924\u21923  (342)"},{name:"l2",value:"5\u21926\u21924  (465)"},{name:"carryover",value:0}]});r<U.length||s<X.length||n;){let t=r<U.length?U[r]:0,a=s<X.length?X[s]:0,e=t+a+n,o=n,l=e%10;n=e>=10?1:0,u.push(l);let h=e>=10?` Since ${e} \u2265 10, write ${l} and carry 1 into the next column.`:` ${e} < 10, so carryover becomes 0.`;i.push({explanation:`l1tVal=${t}, l2tVal=${a}, carryover=${o}. digitSum = ${t} + ${a} + ${o} = ${e}. Append ListNode(digitSum % 10) = ${l} to the result.${h}`,highlightLine:23,state:{type:"linked-list",nodes:Le(r+1<U.length?r+1:null,s+1<X.length?s+1:null),pointers:[...r+1<U.length?[{nodeId:`a${r+1}`,label:"l1t"}]:[{nodeId:null,label:"l1t=None"}],...s+1<X.length?[{nodeId:`b${s+1}`,label:"l2t"}]:[{nodeId:null,label:"l2t=None"}]],result:ha(u,u.length-1)},variables:[{name:"l1tVal",value:t},{name:"l2tVal",value:a},{name:"digitSum",value:e,highlight:!0},{name:"ListNode(digitSum%10)",value:l,highlight:!0},{name:"carryover",value:n,highlight:e>=10},{name:"result",value:`[${u.join("\u2192")}]`}]}),r++,s++}return i.push({explanation:`Both lists are exhausted and carryover is 0 \u2014 the loop condition fails and we return dummyResultNode.next. Result list ${u.join("\u2192")} reads as 807 (again least-significant-first). Each node is visited once: O(max(m, n)) time, O(max(m, n)) for the result list.`,highlightLine:30,state:{type:"linked-list",nodes:Le(null,null),pointers:[{nodeId:null,label:"l1t"},{nodeId:null,label:"l2t"}],result:ha(u)},variables:[{name:"return",value:`[${u.join("\u2192")}]  (807)`,highlight:!0}]}),i}var mo={label:"Elementary Addition",pythonCode:co,generateSteps:po,timeComplexity:"O(max(m, n))",spaceComplexity:"O(max(m, n))"},da={id:"add-two-numbers",lcNumber:2,title:"Add Two Numbers",difficulty:"Medium",category:"linked-list",tags:["Linked List","Math","Recursion"],timeComplexity:"O(max(m, n))",spaceComplexity:"O(max(m, n))",description:"You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each node contains a single digit. Add the two numbers and return the sum as a linked list, also in reverse order.",examples:[{input:"l1 = [2,4,3], l2 = [5,6,4]",output:"[7,0,8]",explanation:"342 + 465 = 807."},{input:"l1 = [0], l2 = [0]",output:"[0]"},{input:"l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]",output:"[8,9,9,9,0,0,0,1]"}],constraints:["The number of nodes in each list is in the range [1, 100].","0 \u2264 Node.val \u2264 9","The number has no leading zeros, except the number 0 itself."],hint:"Because digits are already reversed, add column-by-column from the heads. Keep a single carry variable and keep looping while either list has nodes left OR a carry remains.",solutions:[mo]};var go=`class Solution:
    def nextGreaterElement(self, nums1: List[int], nums2: List[int]) -> List[int]:
        # monotonic stack practice
        # naive solution is to loop through both nums1 and nums2 and look for next greater giving us O(n^2)
        # what we can do instead of find all next greater elements first for nums2
        # we can do this with monotonic decreasing stack and then store as a map {num -> next greater}
        # then just go through nums1 and look for mapped value
        nextGreaterMap = {}
        stack = collections.deque()
        for i in range(len(nums2)):
            # if nums2[i] breaks stack's order
            # it is the next greater element
            while stack and nums2[i] > stack[-1]:
                value = stack.pop()
                nextGreaterMap[value] = nums2[i]
            stack.append(nums2[i])

        result = []

        for n in nums1:
            if n not in nextGreaterMap:
                result.append(-1)
            else:
                result.append(nextGreaterMap[n])

        return result`;function fo(){let i=[4,1,2],u=[1,3,4,2],r=[],s=[],n={},t=(o,l)=>u.map((h,d)=>{let c="default";return d<o&&(c="visited"),d===o&&(c="active"),l!==void 0&&h===l&&(c="found"),{value:h,state:c}}),a="nextGreaterMap (num\u2192next greater)";r.push({explanation:'For every value in nums2 we want its "next greater element" \u2014 the first larger value to its right. Brute force is O(n\xB2). A monotonic decreasing stack does it in one pass: whenever a new value is bigger than the stack top, that new value is the answer for everything it pops. Then nums1 queries are O(1) map lookups.',highlightLine:9,state:{type:"array",cells:t(-1),pointers:[],arrayLabel:"nums2 (scan to build the map)",stackItems:[],hashmap:{},hashmapLabel:a},variables:[{name:"nums1",value:"[4, 1, 2]"},{name:"nums2",value:"[1, 3, 4, 2]"},{name:"stack",value:"[]"}]});for(let o=0;o<u.length;o++){let l=u[o];for(r.push({explanation:`i=${o}: look at nums2[${o}] = ${l}. Compare it against the top of the stack. While ${l} is greater than the stack top, that top has just found its next greater element.`,highlightLine:11,state:{type:"array",cells:t(o),pointers:[{index:o,label:"i"}],arrayLabel:"nums2 (scan to build the map)",stackItems:[...s],hashmap:y({},n),hashmapLabel:a},variables:[{name:"i",value:o,highlight:!0},{name:"nums2[i]",value:l,highlight:!0},{name:"stack",value:s.length?`[${s.join(", ")}]`:"[]"}]});s.length&&l>s[s.length-1];){let h=s.pop();n[h]=l,r.push({explanation:`${l} > ${h} (stack top). Pop ${h} \u2014 its next greater element is ${l}. Record nextGreaterMap[${h}] = ${l}, then keep checking the new top.`,highlightLine:15,state:{type:"array",cells:t(o,h),pointers:[{index:o,label:"i"}],arrayLabel:"nums2 (scan to build the map)",stackItems:[...s],hashmap:y({},n),hashmapLabel:a},variables:[{name:"value (popped)",value:h,highlight:!0},{name:`nextGreaterMap[${h}]`,value:l,highlight:!0},{name:"stack",value:s.length?`[${s.join(", ")}]`:"[]"}]})}s.push(l),r.push({explanation:`Nothing left on the stack is smaller than ${l}. Push ${l}. The stack stays monotonically decreasing bottom\u2192top \u2014 each value waits here until a larger one arrives.`,highlightLine:16,state:{type:"array",cells:t(o),pointers:[{index:o,label:"i"}],arrayLabel:"nums2 (scan to build the map)",stackItems:[...s],hashmap:y({},n),hashmapLabel:a},variables:[{name:"pushed",value:l,highlight:!0},{name:"stack",value:`[${s.join(", ")}]`}]})}r.push({explanation:`Scan of nums2 complete. Anything still on the stack ([${s.join(", ")}]) never found a greater element to its right \u2014 those values simply aren't in the map and will default to -1. Final map: ${JSON.stringify(n)}.`,highlightLine:18,state:{type:"array",cells:u.map(o=>({value:o,state:"visited"})),pointers:[],arrayLabel:"nums2 (fully scanned)",stackItems:[...s],hashmap:y({},n),hashmapLabel:a},variables:[{name:"nextGreaterMap",value:JSON.stringify(n)},{name:"unresolved",value:s.length?`[${s.join(", ")}] \u2192 -1`:"none"}]});let e=[];for(let o=0;o<i.length;o++){let l=i[o],h=l in n,d=h?n[l]:-1;e.push(d),r.push({explanation:h?`Query nums1[${o}] = ${l}. It's in the map: nextGreaterMap[${l}] = ${d}. Append ${d}.`:`Query nums1[${o}] = ${l}. It isn't in the map \u2014 no greater element to its right in nums2. Append -1.`,highlightLine:h?24:22,state:{type:"array",cells:i.map((c,p)=>({value:c,state:p<o?"visited":p===o?h?"found":"eliminated":"default"})),pointers:[{index:o,label:"n"}],arrayLabel:"nums1 (answer each query)",stackItems:[],hashmap:y({},n),hashmapLabel:a},variables:[{name:"n",value:l,highlight:!0},{name:"nextGreaterMap[n]",value:h?d:"absent",highlight:!0},{name:"result",value:`[${e.join(", ")}]`}]})}return r.push({explanation:`All nums1 queries answered by O(1) map lookups. Result: [${e.join(", ")}]. Building the map is O(n) \u2014 each nums2 value is pushed and popped at most once \u2014 and the queries add O(m), for O(n + m) total.`,highlightLine:26,state:{type:"array",cells:i.map(o=>({value:o,state:"found"})),pointers:[],arrayLabel:"nums1 (done)",stackItems:[],hashmap:y({},n),hashmapLabel:a,counters:[{label:"result",value:`[${e.join(", ")}]`}]},variables:[{name:"result",value:`[${e.join(", ")}]`,highlight:!0}]}),r}var vo={label:"Monotonic Stack",pythonCode:go,generateSteps:fo,timeComplexity:"O(n + m)",spaceComplexity:"O(n)"},ca={id:"next-greater-element-i",lcNumber:496,title:"Next Greater Element I",difficulty:"Easy",category:"stack",tags:["Stack","Monotonic Stack","Hash Map","Array"],timeComplexity:"O(n + m)",spaceComplexity:"O(n)",description:"You are given two distinct 0-indexed integer arrays nums1 and nums2, where nums1 is a subset of nums2. For each element in nums1, find its next greater element in nums2 \u2014 the first element to its right that is greater. If none exists, the answer is -1.",examples:[{input:"nums1 = [4,1,2], nums2 = [1,3,4,2]",output:"[-1,3,-1]",explanation:"4 has no greater element to its right; 1 \u2192 3; 2 has none."},{input:"nums1 = [2,4], nums2 = [1,2,3,4]",output:"[3,-1]",explanation:"2 \u2192 3; 4 has no greater element to its right."}],constraints:["1 \u2264 nums1.length \u2264 nums2.length \u2264 1000","0 \u2264 nums1[i], nums2[i] \u2264 10\u2074","All integers in nums1 and nums2 are unique.","All integers of nums1 also appear in nums2."],hint:"Precompute the next greater element for every value in nums2 with a monotonic decreasing stack, store value \u2192 answer in a map, then answer each nums1 query in O(1).",solutions:[vo]};var yo=`class TrieNode:
    def __init__(self):
        # char -> TrieNode map
        self.children = {}
        # does a word end here
        self.isEnd = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        inc = self.root
        for char in word:
            # if we haven't seen this char yet
            # append to inc.children as a new child
            if char not in inc.children:
                inc.children[char] = TrieNode()
            # when we are here, the char is guaranteed in the Trie so we go down the trie
            inc = inc.children[char]
        # when we finish, mark inc.isEnd as True
        inc.isEnd = True

    def search(self, word: str) -> bool:
        inc = self.root
        for char in word:
            if char not in inc.children:
                return False
            # if it is, we step down the inc
            inc = inc.children[char]
        return inc.isEnd

    def startsWith(self, prefix: str) -> bool:
        inc = self.root
        for char in prefix:
            if char not in inc.children:
                return False
            # if it is, we step down the inc
            inc = inc.children[char]
        return True`,k={root:{x:60,y:170,char:"\u2022"},a:{x:170,y:90,char:"a"},ap:{x:280,y:90,char:"p"},app:{x:390,y:90,char:"p"},appl:{x:500,y:90,char:"l"},apple:{x:610,y:90,char:"e"},b:{x:170,y:250,char:"b"},ba:{x:280,y:250,char:"a"},bad:{x:390,y:250,char:"d"}},bo=[["root","a"],["a","ap"],["ap","app"],["app","appl"],["appl","apple"],["root","b"],["b","ba"],["ba","bad"]],ee={apple:["a","ap","app","appl","apple"],app:["a","ap","app"],bad:["b","ba","bad"]};function wo(){let i=[],u=new Set(["root"]),r=new Set,s="\u2014",n=a=>k[a].char+(r.has(a)?"\u2713":""),t=(a,e,o,l,h,d)=>{let c=new Set(l),p=[...u].map(f=>({id:f,x:k[f].x,y:k[f].y,label:n(f),state:f===o?"active":c.has(f)?"visited":r.has(f)?"found":"default"})),m=bo.filter(([f,g])=>u.has(f)&&u.has(g)).map(([f,g])=>({from:f,to:g,state:g===o?"active":c.has(g)?"visited":"default"}));return{explanation:a,highlightLine:e,state:{type:"graph",nodes:p,edges:m,counters:[{label:"operation",value:s},...h!==void 0?[{label:"returns",value:h}]:[]]},variables:d}};i.push(t("A trie (prefix tree) stores words character by character. Every node is a TrieNode with a children map (char \u2192 node) and an isEnd flag marking where a word finishes. We start with just an empty root. Word-end nodes are drawn with a \u2713.",11,"root",[],void 0,[{name:"self.root",value:"TrieNode()"},{name:"children",value:"{}"}])),s='insert("apple")',i.push(t('insert("apple"): start the cursor inc at the root, then walk one character at a time.',14,"root",["root"],void 0,[{name:"word",value:'"apple"'},{name:"inc",value:"root"}]));{let a=ee.apple,e=["root"],o="root";for(let l=0;l<a.length;l++){let h=a[l],d=k[h].char;u.add(h),e.push(h),i.push(t(`char '${d}': '${d}' is not in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 create a new TrieNode for it (line 18), then descend: inc = inc.children['${d}'] (line 20).`,18,h,e,void 0,[{name:"char",value:`'${d}'`,highlight:!0},{name:"in children?",value:"no \u2192 create"},{name:"inc",value:`'${d}'`,highlight:!0}])),o=h}r.add("apple"),i.push(t(`End of word: mark inc.isEnd = True. The node holding 'e' now terminates the word "apple" (shown with \u2713).`,22,"apple",e,void 0,[{name:"inc.isEnd",value:"True",highlight:!0}]))}s='insert("app")',i.push(t('insert("app"): reset inc to root. Notice "app" shares the prefix we already built.',14,"root",["root"],void 0,[{name:"word",value:'"app"'},{name:"inc",value:"root"}]));{let a=ee.app,e=["root"],o="root";for(let l=0;l<a.length;l++){let h=a[l],d=k[h].char;e.push(h),i.push(t(`char '${d}': '${d}' is already in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 skip the create (line 17 is false), just descend (line 20). No new node is added.`,20,h,e,void 0,[{name:"char",value:`'${d}'`,highlight:!0},{name:"in children?",value:"yes \u2192 reuse"},{name:"inc",value:`'${d}'`,highlight:!0}])),o=h}r.add("app"),i.push(t(`Mark inc.isEnd = True on the second 'p'. This is an INTERNAL node \u2014 it still has a child 'l' leading to "apple" \u2014 proving a word can end in the middle of a longer path.`,22,"app",e,void 0,[{name:"inc.isEnd",value:"True",highlight:!0}]))}s='insert("bad")',i.push(t(`insert("bad"): reset inc to root. 'b' is a brand-new branch off the root.`,14,"root",["root"],void 0,[{name:"word",value:'"bad"'},{name:"inc",value:"root"}]));{let a=ee.bad,e=["root"],o="root";for(let l=0;l<a.length;l++){let h=a[l],d=k[h].char;u.add(h),e.push(h),i.push(t(`char '${d}': not in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 create a new TrieNode (line 18) and descend (line 20).`,18,h,e,void 0,[{name:"char",value:`'${d}'`,highlight:!0},{name:"in children?",value:"no \u2192 create"},{name:"inc",value:`'${d}'`,highlight:!0}])),o=h}r.add("bad"),i.push(t(`Mark inc.isEnd = True on 'd'. "bad" is stored in its own branch, sharing nothing with the "app\u2026" branch.`,22,"bad",e,void 0,[{name:"inc.isEnd",value:"True",highlight:!0}]))}s='search("app")',i.push(t('search("app"): reset inc to root and walk each character, checking it exists.',25,"root",["root"],void 0,[{name:"word",value:'"app"'}]));{let a=ee.app,e=["root"],o="root";for(let l of a){let h=k[l].char;e.push(l),i.push(t(`char '${h}': '${h}' is in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children (line 27 false) \u2192 step down (line 30).`,30,l,e,void 0,[{name:"char",value:`'${h}'`,highlight:!0},{name:"inc",value:`'${h}'`}])),o=l}i.push(t(`Reached the end of "app" at the second 'p'. return inc.isEnd \u2192 True: we marked this node as a word-end during insert("app").`,31,"app",e,"True",[{name:"inc.isEnd",value:"True",highlight:!0}]))}s='search("ap")',i.push(t('search("ap"): reset inc to root.',25,"root",["root"],void 0,[{name:"word",value:'"ap"'}]));{let a=ee.app.slice(0,2),e=["root"],o="root";for(let l of a){let h=k[l].char;e.push(l),i.push(t(`char '${h}': found in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 step down (line 30).`,30,l,e,void 0,[{name:"char",value:`'${h}'`,highlight:!0},{name:"inc",value:`'${h}'`}])),o=l}i.push(t(`End of "ap" at the first 'p'. return inc.isEnd \u2192 False: this node exists, but "ap" was only ever a prefix \u2014 never inserted as a whole word. search is strict about isEnd; startsWith is not.`,31,"ap",e,"False",[{name:"inc.isEnd",value:"False",highlight:!0}]))}s='search("bat")',i.push(t('search("bat"): reset inc to root.',25,"root",["root"],void 0,[{name:"word",value:'"bat"'}]));{let a=[["b","b"],["a","ba"]],e=["root"],o="root";for(let[l,h]of a)e.push(h),i.push(t(`char '${l}': found in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 step down (line 30).`,30,h,e,void 0,[{name:"char",value:`'${l}'`,highlight:!0},{name:"inc",value:`'${l}'`}])),o=h;i.push(t(`char 't': node 'a' (in the "ba\u2026" branch) has only one child, 'd'. 't' is not in inc.children \u2192 return False immediately (line 28). No point scanning further.`,28,"ba",e,"False",[{name:"char",value:"'t'",highlight:!0},{name:"'t' in children?",value:"no \u2192 return False",highlight:!0}]))}s='startsWith("app")',i.push(t('startsWith("app"): reset inc to root. Same walk as search, but the ending rule differs.',34,"root",["root"],void 0,[{name:"prefix",value:'"app"'}]));{let a=ee.app,e=["root"],o="root";for(let l of a){let h=k[l].char;e.push(l),i.push(t(`char '${h}': in ${k[o].char==="\u2022"?"root":`'${k[o].char}'`}.children \u2192 step down (line 39).`,39,l,e,void 0,[{name:"char",value:`'${h}'`,highlight:!0},{name:"inc",value:`'${h}'`}])),o=l}i.push(t('Every character of "app" matched an existing node. startsWith does NOT check isEnd \u2014 simply reaching the end of the prefix means some word has it as a prefix. return True.',40,"app",e,"True",[{name:"result",value:"True",highlight:!0}]))}return s="done",i.push(t('The finished trie stores "apple", "app", and "bad" with shared prefixes collapsed into shared paths. Each insert / search / startsWith walks exactly one node per character: O(L) per operation where L is the word length, independent of how many words are stored. Space is O(total characters inserted).',42,"",[],void 0,[{name:"stored words",value:"apple, app, bad"}])),i}var xo={label:"TrieNode (children map)",pythonCode:yo,generateSteps:wo,timeComplexity:"O(L) per op",spaceComplexity:"O(total chars)"},pa={id:"implement-trie",lcNumber:208,title:"Implement Trie (Prefix Tree)",difficulty:"Medium",category:"trie",tags:["Trie","Design","Hash Map","String"],timeComplexity:"O(L) per op",spaceComplexity:"O(total chars)",description:"Implement a trie (prefix tree) supporting insert(word), search(word) \u2014 true only if the exact word was inserted \u2014 and startsWith(prefix) \u2014 true if any inserted word has the given prefix. Each node holds a children map (char \u2192 node) and an isEnd flag.",examples:[{input:`["Trie","insert","search","search","startsWith","insert","search"]
[[],["apple"],["apple"],["app"],["app"],["app"],["app"]]`,output:"[null, null, true, false, true, null, true]",explanation:'insert("apple"); search("apple")\u2192true; search("app")\u2192false (not yet a full word); startsWith("app")\u2192true; insert("app"); search("app")\u2192true.'}],constraints:["1 \u2264 word.length, prefix.length \u2264 2000","word and prefix consist only of lowercase English letters.","At most 3\xD710\u2074 calls in total to insert, search, and startsWith."],hint:"Give each node a dictionary of child nodes keyed by character and a boolean isEnd. insert walks/creates nodes char by char and flags the last; search does the same walk and returns the last node's isEnd; startsWith returns true as long as the walk never hits a missing child.",solutions:[xo]};var $o=`class StockSpanner:
    # [7,2,1,2,4]
    # [1,1,1,3,4]
    # we increment if prior value is smaller
    # so while stack[-1] <= current: pop
    # since we are popping out of the stack, we need to keep track at each point
    # so (value, span) for the decreasing stack
    def __init__(self):
        self.decreasingStack = []

    def next(self, price: int) -> int:
        currentSpan = 1
        while self.decreasingStack and price >= self.decreasingStack[-1][0]:
            priorValue, priorSpan = self.decreasingStack.pop()
            currentSpan += priorSpan
        self.decreasingStack.append((price, currentSpan))
        return currentSpan`;function ko(){let i=[100,80,60,70,60,75,85],u=[],r=[],s=i.map(()=>"?"),n=a=>i.map((e,o)=>({value:e,state:o<a?"visited":o===a?"active":"default"})),t=()=>r.map(a=>`(${a.value}, ${a.span})`);u.push({explanation:"StockSpanner.next(price) returns how many consecutive prior days (including today) had price \u2264 today. We keep a monotonic decreasing stack of (price, span) pairs: each entry already absorbs the span of every smaller day it swallowed.",highlightLine:1,state:{type:"array",cells:n(-1),pointers:[],stackItems:[],counters:[{label:"decreasingStack",value:"empty"}]},variables:[]});for(let a=0;a<i.length;a++){let e=i[a],o=1;for(u.push({explanation:`next(${e}) \u2014 call #${a+1}. currentSpan starts at 1 (today counts). Now pop every stacked day whose price \u2264 ${e}, folding its span in.`,highlightLine:12,state:{type:"array",cells:n(a),pointers:[{index:a,label:"today"}],stackItems:t(),counters:[{label:"price",value:e},{label:"currentSpan",value:o},{label:"result",value:s.map(h=>h==="?"?"\xB7":h).join(" ")}]},variables:[{name:"price",value:e,highlight:!0},{name:"currentSpan",value:o}]});r.length>0&&e>=r[r.length-1].value;){let h=r[r.length-1];o+=h.span,r.pop(),u.push({explanation:`Top of stack is (${h.value}, ${h.span}) and ${h.value} \u2264 ${e}, so it is engulfed: pop it and add its span ${h.span} \u2192 currentSpan = ${o}.`,highlightLine:14,state:{type:"array",cells:n(a),pointers:[{index:a,label:"today"}],stackItems:t(),counters:[{label:"price",value:e},{label:"currentSpan",value:o},{label:"popped span",value:h.span}]},variables:[{name:"priorValue",value:h.value},{name:"priorSpan",value:h.span},{name:"currentSpan",value:o,highlight:!0}]})}r.push({value:e,span:o}),s[a]=o;let l=r.length===1?"stack is now the only entry (all prior days were \u2264 today)":`top (${r[r.length-2].value}) > ${e}, so the while loop stops`;u.push({explanation:`Push (${e}, ${o}) \u2014 ${l}. return ${o}. This is the span for day ${a+1}.`,highlightLine:16,state:{type:"array",cells:i.map((h,d)=>({value:h,state:d<a?"visited":d===a?"found":"default"})),pointers:[{index:a,label:"today"}],stackItems:t(),counters:[{label:"price",value:e},{label:"returned span",value:o},{label:"result",value:s.map(h=>h==="?"?"\xB7":h).join(" ")}]},variables:[{name:"return",value:o,highlight:!0}]})}return u.push({explanation:`All calls done. Spans returned in order: [${s.join(", ")}]. Each next() is amortized O(1): every price is pushed once and popped at most once across all calls.`,highlightLine:17,state:{type:"array",cells:i.map(a=>({value:a,state:"found"})),pointers:[],stackItems:t(),counters:[{label:"spans",value:s.join(" ")}]},variables:[]}),u}var So={label:"Monotonic Decreasing Stack",pythonCode:$o,generateSteps:ko,timeComplexity:"O(1) amortized per next()",spaceComplexity:"O(n)"},ma={id:"online-stock-span",lcNumber:901,title:"Online Stock Span",difficulty:"Medium",category:"stack",tags:["Stack","Monotonic Stack","Design"],timeComplexity:"O(1) amortized",spaceComplexity:"O(n)",description:"Design a StockSpanner that, for each daily price, returns the stock's span: the maximum number of consecutive days (ending today, going backward) whose price was less than or equal to today's price. Implement next(price), called once per day in order.",examples:[{input:"next calls: 100, 80, 60, 70, 60, 75, 85",output:"1, 1, 1, 2, 1, 4, 6",explanation:"e.g. next(75) \u2192 4 because the last 4 prices (60, 70, 60, 75) were all \u2264 75."}],constraints:["1 \u2264 price \u2264 10\u2075","At most 10\u2074 calls will be made to next."],hint:"Keep a monotonic decreasing stack of (price, span) pairs. On next(price), start span at 1, then pop every entry with price \u2264 today and add its span in \u2014 that entry already summarizes all the smaller days it once swallowed, so you never re-scan them.",solutions:[So]};var Lo=`class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        # we can do an old to new mapping like how we do tree copies

        if not head:
            return None

        oldToNew = {}

        node = head
        while node:
            newNode = Node(node.val)
            oldToNew[node] = newNode
            node = node.next

        node = head
        while node:
            copy = oldToNew[node]
            if node.next:
                copy.next = oldToNew[node.next]
            if node.random:
                copy.random = oldToNew[node.random]
            node = node.next
        return oldToNew[head]`,S=[7,13,11,10,1],ga=[null,0,4,2,0];function Oo(){let i=[],u=S.length,r=c=>60+c*90,s=(c,p)=>({id:`o${c}`,x:r(c),y:60,state:p,label:`${S[c]}`}),n=(c,p)=>({id:`c${c}`,x:r(c),y:190,state:p,label:`${S[c]}'`}),t=[];for(let c=0;c<u-1;c++)t.push({from:`o${c}`,to:`o${c+1}`,state:"default"});let a=[];ga.forEach((c,p)=>{c!==null&&a.push({from:`o${p}`,to:`o${c}`,state:"visited"})});let e=[],o=[],l={},h=(c,p,m,f)=>({type:"graph",directed:!0,nodes:[...S.map((g,v)=>s(v,c[v]??"default")),...S.map((g,v)=>p.has(v)?n(v,v===m?"active":"found"):null).filter(g=>g!==null)],edges:[...t,...a,...e,...o],hashmap:y({},l),hashmapLabel:"oldToNew",counters:f});i.push({explanation:"Deep-copy a list where each node also has a random pointer (anywhere / null). Curved edges are random pointers, straight edges are next. Strategy (like copying a tree): a hashmap oldToNew from each original node to its fresh copy, built in two passes.",highlightLine:3,state:h({},new Set,null,[{label:"oldToNew",value:"empty"}]),variables:[]}),i.push({explanation:"Pass 1 \u2014 walk the list; for each original node create a bare copy (value only, no pointers yet) and store oldToNew[node] = newNode.",highlightLine:11,state:h({0:"active"},new Set,null,[{label:"pass",value:1}]),variables:[{name:"node.val",value:S[0]}]});let d=new Set;for(let c=0;c<u;c++)d.add(c),l[S[c]]=`${S[c]}'`,i.push({explanation:`Create copy ${S[c]}' for original ${S[c]}. Record oldToNew[${S[c]}] = ${S[c]}'. Advance node = node.next.`,highlightLine:13,state:h({[c]:"active"},new Set(d),c,[{label:"pass",value:1},{label:"copies made",value:d.size}]),variables:[{name:"node.val",value:S[c],highlight:!0},{name:"newNode.val",value:`${S[c]}'`}]});i.push({explanation:"Pass 2 \u2014 walk the list again. For each original, look up its copy, then set copy.next = oldToNew[node.next] and copy.random = oldToNew[node.random]. The map guarantees every referenced copy already exists.",highlightLine:17,state:h({0:"active"},new Set(d),0,[{label:"pass",value:2}]),variables:[]});for(let c=0;c<u;c++){c<u-1&&e.push({from:`c${c}`,to:`c${c+1}`,state:"default"});let p=ga[c];p!==null&&o.push({from:`c${c}`,to:`c${p}`,state:"found"});let m=c<u-1?`${S[c+1]}'`:"None",f=p===null?"None":`${S[p]}'`;i.push({explanation:`Copy ${S[c]}': set .next \u2192 ${m} (oldToNew[node.next]) and .random \u2192 ${f} (oldToNew[node.random]). Both pulled straight from the map \u2014 no dangling pointers to originals.`,highlightLine:20,state:h({[c]:"active"},new Set(d),c,[{label:"pass",value:2},{label:"copy.next",value:m},{label:"copy.random",value:f}]),variables:[{name:"copy",value:`${S[c]}'`,highlight:!0},{name:"copy.next",value:m},{name:"copy.random",value:f}]})}return i.push({explanation:`Both passes done. Return oldToNew[head] = ${S[0]}' \u2014 the head of a fully independent deep copy. Time O(n), space O(n) for the map.`,highlightLine:26,state:h({},new Set(d),0,[{label:"return",value:`${S[0]}'`}]),variables:[{name:"return",value:`${S[0]}'`,highlight:!0}]}),i}var Co={label:"Two-Pass HashMap (oldToNew)",pythonCode:Lo,generateSteps:Oo,timeComplexity:"O(n)",spaceComplexity:"O(n)"},fa={id:"copy-list-with-random-pointer",lcNumber:138,title:"Copy List with Random Pointer",difficulty:"Medium",category:"linked-list",tags:["Linked List","Hash Table"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"A linked list of length n is given where each node has an extra random pointer that can point to any node or null. Construct a deep copy: n brand-new nodes whose next and random pointers mirror the original structure but reference only the new nodes.",examples:[{input:"head = [[7,null],[13,0],[11,4],[10,2],[1,0]]",output:"[[7,null],[13,0],[11,4],[10,2],[1,0]]"}],constraints:["0 \u2264 n \u2264 1000","-10\u2074 \u2264 Node.val \u2264 10\u2074","Node.random is null or points to a node in the list."],hint:"Copy it like a tree: a hashmap from each original node to its fresh copy. Pass 1 creates all the bare copies and fills the map; pass 2 wires each copy.next and copy.random by looking the target up in the map \u2014 so every reference already resolves to a copy, never an original.",solutions:[Co]};var Mo=`class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        # preorder = root, left, right
        # inorder = left, root, right
        # preorder[0] is the root
        if not preorder:
            return None

        root = TreeNode(preorder[0])
        mid = inorder.index(preorder[0])
        # left : we want inorder items before mid
        # from preorder, we want node 1 to node mid because we know there are mid number of left nodes
        root.left = self.buildTree(preorder[1:mid+1], inorder[:mid])
        # right : we want inorder items after mid
        # from preorder, we want everythign after the mid node since those are right nodes
        root.right = self.buildTree(preorder[1+mid:], inorder[1+mid:])

        return root`,va=[3,9,20,15,7],ya=[9,3,15,20,7],To={3:{left:9,right:20},9:{left:null,right:null},20:{left:15,right:7},15:{left:null,right:null},7:{left:null,right:null}};function No(){let i=[],u=new Set,r=t=>`n${t}`,s=t=>({type:"tree",nodes:[...u].map(a=>{let e=To[a];return{id:r(a),value:a,state:a===t?"active":"visited",leftId:e.left!==null&&u.has(e.left)?r(e.left):null,rightId:e.right!==null&&u.has(e.right)?r(e.right):null}}),counters:[{label:"preorder",value:`[${va.join(",")}]`},{label:"inorder",value:`[${ya.join(",")}]`},{label:"nodes built",value:u.size}]});i.push({explanation:"Rebuild the tree from preorder [root, left\u2026, right\u2026] and inorder [left\u2026, root, right\u2026]. Key insight: preorder[0] is always the current root; its position in inorder splits the remaining values into the left subtree (before it) and right subtree (after it). Recurse on each side.",highlightLine:5,state:s(null),variables:[]});let n=(t,a,e)=>{if(t.length===0){i.push({explanation:`${e}: preorder slice is empty \u2192 return None (no node here).`,highlightLine:8,state:s(null),variables:[{name:"preorder",value:"[]"},{name:"return",value:"None"}]});return}let o=t[0],l=a.indexOf(o);u.add(o);let h=t.slice(1,l+1),d=a.slice(0,l),c=t.slice(l+1),p=a.slice(l+1);i.push({explanation:`${e}: root = preorder[0] = ${o}. Find ${o} in inorder at index ${l}. Everything left of it in inorder ([${d.join(",")}]) is the left subtree; everything right ([${p.join(",")}]) is the right subtree.`,highlightLine:11,state:s(o),variables:[{name:"root",value:o,highlight:!0},{name:"mid",value:l},{name:"pre",value:`[${t.join(",")}]`},{name:"in",value:`[${a.join(",")}]`}]}),n(h,d,`${o}.left`),n(c,p,`${o}.right`),i.push({explanation:`${e}: both children of ${o} attached \u2014 return node ${o} up to its parent.`,highlightLine:20,state:s(o),variables:[{name:"return",value:o,highlight:!0}]})};return n(va,ya,"root"),i.push({explanation:"Recursion complete \u2014 the whole tree is reconstructed. Each value is created once and inorder.index is scanned per node, giving O(n\xB2) worst case (a hashmap of value\u2192inorder-index would make it O(n)).",highlightLine:20,state:s(null),variables:[]}),i}var Io={label:"Recursive Preorder/Inorder Split",pythonCode:Mo,generateSteps:No,timeComplexity:"O(n\xB2) (O(n) with an index map)",spaceComplexity:"O(n)"},ba={id:"construct-tree-preorder-inorder",lcNumber:105,title:"Construct Binary Tree from Preorder and Inorder Traversal",difficulty:"Medium",category:"trees",tags:["Tree","Array","Divide and Conquer","Recursion"],timeComplexity:"O(n\xB2)",spaceComplexity:"O(n)",description:"Given preorder and inorder traversals of a binary tree with unique values, construct and return the tree.",examples:[{input:"preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",output:"[3,9,20,null,null,15,7]"},{input:"preorder = [-1], inorder = [-1]",output:"[-1]"}],constraints:["1 \u2264 preorder.length \u2264 3000","inorder.length == preorder.length","preorder and inorder consist of unique values; each value of inorder also appears in preorder."],hint:"preorder[0] is the root. Locate it in inorder: values before it form the left subtree, values after it form the right subtree \u2014 and their counts tell you exactly how to slice preorder. Recurse on each half.",solutions:[Io]};var qo=`class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        # tackle the most frequent task first (it is the bottleneck) \u2192 max heap
        # each round we pop n + 1 tasks (that is the cooldown window)
        # leftover tasks (still > 0) go back on the heap
        freqMap = Counter(tasks)
        maxHeap = []
        result = 0

        for key, value in freqMap.items():
            heapq.heappush(maxHeap, (-value, key))

        while maxHeap:
            tasksLeftOver = set()
            for _ in range(n + 1):
                if maxHeap:
                    currentTaskCounter, currentTask = heapq.heappop(maxHeap)
                    currentTaskCounter += 1          # one instance done
                    result += 1
                    if currentTaskCounter < 0:
                        tasksLeftOver.add((currentTaskCounter, currentTask))
                else:
                    if not tasksLeftOver:
                        return result               # all done, no trailing idle
                    result += 1                     # forced idle
            for _ in range(len(tasksLeftOver)):
                heapq.heappush(maxHeap, tasksLeftOver.pop())
        return result`,Ro=`class Solution:
    # O(n) \u2014 no per-slot idle counting; add a whole cooldown window at once
    def leastInterval(self, tasks: List[str], n: int) -> int:
        freqMap = Counter(tasks)
        maxHeap = []
        for key, value in freqMap.items():
            heapq.heappush(maxHeap, (-value, key))

        interval = 0
        maxTaskToDo = n + 1
        while maxHeap:
            sizeOfHeap = len(maxHeap)
            tasksToQueue = min(maxTaskToDo, sizeOfHeap)
            tasksToAddBack = set()
            for _ in range(tasksToQueue):
                currentCounter, currentTask = heapq.heappop(maxHeap)
                currentCounter += 1
                if currentCounter < 0:
                    tasksToAddBack.add((currentCounter, currentTask))
            for currentCounter, currentTask in tasksToAddBack:
                heapq.heappush(maxHeap, (currentCounter, currentTask))
            # full window needed only if tasks remain; else just what we did
            if len(maxHeap) > 0:
                interval += maxTaskToDo
            else:
                interval += tasksToQueue
        return interval`,wa=["A","A","A","B","B","B"];function j(i,u){return Object.keys(i).filter(r=>i[r]>0).sort((r,s)=>i[s]-i[r]||r.localeCompare(s)).map(r=>({value:`${r}\xD7${i[r]}`,state:r===u?"active":"default"}))}function E(i){return Object.keys(i).filter(u=>i[u]>0).sort((u,r)=>i[r]-i[u]||u.localeCompare(r)).map(u=>`(-${i[u]}, ${u})`)}function Po(){let i=[],u={};wa.forEach(t=>u[t]=(u[t]??0)+1);let r=0,s=[];i.push({explanation:"Count each task (A\xD73, B\xD73) and push onto a max-heap keyed by frequency. The most frequent task is the bottleneck, so we always schedule it first. n = 2 \u2192 each cooldown window holds n+1 = 3 slots.",highlightLine:6,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"result",value:0},{label:"n+1",value:3}]},variables:[]});let n=0;for(;Object.values(u).some(t=>t>0);){n++;let t=[];i.push({explanation:`Round ${n}: open a fresh cooldown window of 3 slots. tasksLeftOver = {}. Pop up to 3 distinct tasks; anything still remaining after this round goes back on the heap.`,highlightLine:15,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"result",value:r}]},variables:[{name:"timeline",value:s.join(" ")||"\u2014"}]});for(let a=0;a<3;a++){let e=Object.keys(u).filter(o=>u[o]>0).sort((o,l)=>u[l]-u[o]||o.localeCompare(l));if(e.length>0){let o=e[0];u[o]--,r++,s.push(o),u[o]>0&&t.push([o,u[o]]),i.push({explanation:`Slot ${a+1}: pop the most frequent task ${o} and run it (result \u2192 ${r}). It now has ${u[o]} left${u[o]>0?" \u2192 set aside to re-add after the window":" \u2192 done, drops out"}.`,highlightLine:20,state:{type:"array",cells:j(u,o),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"slot",value:`${a+1}/3`},{label:"result",value:r}]},variables:[{name:"currentTask",value:o,highlight:!0},{name:"result",value:r},{name:"timeline",value:s.join(" ")}]})}else{if(t.length===0)return i.push({explanation:`Slot ${a+1}: heap is empty AND nothing is set aside \u2192 every task is scheduled. Return result = ${r} with no trailing idle.`,highlightLine:24,state:{type:"array",cells:[],pointers:[],stackItems:[],counters:[{label:"result (final)",value:r}]},variables:[{name:"return",value:r,highlight:!0},{name:"timeline",value:s.join(" ")}]}),i;r++,s.push("idle"),i.push({explanation:`Slot ${a+1}: heap is empty but tasks are set aside for the next window \u2192 forced idle. result \u2192 ${r}.`,highlightLine:25,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"slot",value:`${a+1}/3 (idle)`},{label:"result",value:r}]},variables:[{name:"idle",value:"yes",highlight:!0},{name:"timeline",value:s.join(" ")}]})}}t.length>0&&i.push({explanation:`End of round ${n}: push the set-aside tasks back on the heap [${t.map(([a,e])=>`${a}\xD7${e}`).join(", ")}] and start the next window.`,highlightLine:27,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"result",value:r}]},variables:[{name:"timeline",value:s.join(" ")}]})}return i.push({explanation:`Heap empty \u2192 return result = ${r}. Timeline: ${s.join(" ")}.`,highlightLine:29,state:{type:"array",cells:[],pointers:[],stackItems:[],counters:[{label:"result (final)",value:r}]},variables:[{name:"return",value:r,highlight:!0}]}),i}function Ao(){let i=[],u={};wa.forEach(t=>u[t]=(u[t]??0)+1);let r=0,s=3;i.push({explanation:"Same max-heap, but never count idles one-by-one. Each round we process min(heapSize, n+1) tasks, then jump the clock: a full n+1 window if any tasks remain (the gap must be filled), otherwise just the tasks we actually did.",highlightLine:5,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"interval",value:0},{label:"n+1",value:s}]},variables:[]});let n=0;for(;Object.values(u).some(t=>t>0);){n++;let t=Object.keys(u).filter(o=>u[o]>0).length,a=Math.min(s,t);i.push({explanation:`Round ${n}: heap has ${t} distinct tasks. tasksToQueue = min(${s}, ${t}) = ${a}. Pop that many and decrement each.`,highlightLine:15,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"tasksToQueue",value:a},{label:"interval",value:r}]},variables:[{name:"sizeOfHeap",value:t}]});for(let o=0;o<a;o++){let l=Object.keys(u).filter(h=>u[h]>0).sort((h,d)=>u[d]-u[h]||h.localeCompare(d))[0];u[l]--,i.push({explanation:`Pop ${l}, run one instance \u2192 ${u[l]} left${u[l]>0?" (re-added after the round)":" (done)"}.`,highlightLine:18,state:{type:"array",cells:j(u,l),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"popped",value:`${o+1}/${a}`},{label:"interval",value:r}]},variables:[{name:"currentTask",value:l,highlight:!0}]})}let e=Object.values(u).some(o=>o>0);r+=e?s:a,i.push({explanation:e?`Tasks still remain \u2192 this window must be padded to the full ${s}. interval += ${s} \u2192 ${r}.`:`Heap is now empty \u2192 no trailing padding needed. interval += tasksToQueue (${a}) \u2192 ${r}.`,highlightLine:e?24:26,state:{type:"array",cells:j(u,null),pointers:[],stackItems:E(u),counters:[{label:"round",value:n},{label:"interval",value:r}]},variables:[{name:"interval",value:r,highlight:!0}]})}return i.push({explanation:`Heap empty \u2192 return interval = ${r}. Same answer as the per-slot simulation, computed without touching individual idle slots.`,highlightLine:27,state:{type:"array",cells:[],pointers:[],stackItems:[],counters:[{label:"interval (final)",value:r}]},variables:[{name:"return",value:r,highlight:!0}]}),i}var jo={label:"Max-Heap Simulation (count idles)",pythonCode:qo,generateSteps:Po,timeComplexity:"O(total intervals)",spaceComplexity:"O(1) \u2014 at most 26 tasks"},Eo={label:"Max-Heap O(n) (bulk intervals)",pythonCode:Ro,generateSteps:Ao,timeComplexity:"O(n)",spaceComplexity:"O(1) \u2014 at most 26 tasks"},xa={id:"task-scheduler",lcNumber:621,title:"Task Scheduler",difficulty:"Medium",category:"greedy",tags:["Array","Hash Table","Greedy","Heap","Counting"],timeComplexity:"O(n)",spaceComplexity:"O(1)",description:"Given CPU tasks labeled A\u2013Z and a cooldown n, each interval runs one task or idles. Two identical tasks must be at least n intervals apart. Return the minimum number of intervals to finish all tasks.",examples:[{input:'tasks = ["A","A","A","B","B","B"], n = 2',output:"8",explanation:"A \u2192 B \u2192 idle \u2192 A \u2192 B \u2192 idle \u2192 A \u2192 B"},{input:'tasks = ["A","C","A","B","D","B"], n = 1',output:"6"},{input:'tasks = ["A","A","A","B","B","B"], n = 3',output:"10"}],constraints:["1 \u2264 tasks.length \u2264 10\u2074","tasks[i] is an uppercase English letter.","0 \u2264 n \u2264 100"],hint:"The most frequent task is the bottleneck \u2014 schedule greedily from a max-heap. Each cooldown window is n+1 slots wide; pop up to n+1 tasks per round, re-adding any that still have count left. Either count idle slots explicitly, or jump the clock by a whole window at a time for O(n).",solutions:[jo,Eo]};var Fo=`class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        # weighted directed graph \u2014 Bellman-Ford, no adjacency map needed
        # array of size n, all inf except src = 0
        prices = [math.inf] * n
        prices[src] = 0

        # at most k stops = k + 1 edges, so do k + 1 relaxation rounds
        for _ in range(k + 1):
            unsettledPrices = prices.copy()
            for source, target, price in flights:
                # if source unreachable, skip (inf + anything = inf)
                if prices[source] == math.inf:
                    continue
                # read prices (last round) but write unsettledPrices (this round)
                # using unsettledPrices[source] here would chain > k + 1 edges
                if unsettledPrices[target] > prices[source] + price:
                    unsettledPrices[target] = prices[source] + price
            prices = unsettledPrices

        if prices[dst] == math.inf:
            return -1
        return prices[dst]`;var me=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],$a=0,oe=3,K=1,ka={0:{x:60,y:120},1:{x:175,y:55},2:{x:175,y:190},3:{x:300,y:120}},Q=i=>i===1/0?"\u221E":`${i}`;function Do(){let i=[],u=(e,o)=>Array.from({length:4},(l,h)=>({id:h,x:ka[h].x,y:ka[h].y,state:h===e?"active":h===$a?"found":o[h]!==1/0?"visited":"default",label:`${h}`})),r=e=>me.map((o,l)=>({from:o[0],to:o[1],state:l===e?"active":"default"})),s=e=>{let o={};return e.forEach((l,h)=>o[h]=Q(l)),o},n=Array(4).fill(1/0);n[$a]=0;let t=me.map(e=>`${e[0]}\u2192${e[1]}:$${e[2]}`).join("  ");i.push({explanation:`Bellman-Ford. Flights: ${t}. src=0, dst=3, k=1. prices[] starts \u221E except prices[0]=0. "At most k stops" = k+1 edges, so we run exactly k+1 = 2 relaxation rounds \u2014 each round can extend a path by one more edge.`,highlightLine:6,state:{type:"graph",directed:!0,nodes:u(null,n),edges:r(null),hashmap:s(n),hashmapLabel:"prices",counters:[{label:"round",value:`0 / ${K+1}`}]},variables:[{name:"prices",value:`[${n.map(Q).join(", ")}]`}]});for(let e=0;e<K+1;e++){let o=[...n];i.push({explanation:`Round ${e+1} of ${K+1}: copy prices \u2192 unsettledPrices. We will READ from prices (locked at last round's values) and WRITE to unsettledPrices, so no path grows by more than one edge this round.`,highlightLine:12,state:{type:"graph",directed:!0,nodes:u(null,n),edges:r(null),hashmap:s(n),hashmapLabel:"prices (locked)",hashmap2:s(o),hashmap2Label:"unsettled (writing)",counters:[{label:"round",value:`${e+1} / ${K+1}`}]},variables:[]});for(let l=0;l<me.length;l++){let[h,d,c]=me[l];if(n[h]===1/0){i.push({explanation:`Flight ${h}\u2192${d} ($${c}): prices[${h}] is \u221E (city ${h} unreachable so far) \u2192 skip.`,highlightLine:16,state:{type:"graph",directed:!0,nodes:u(h,n),edges:r(l),hashmap:s(n),hashmapLabel:"prices (locked)",hashmap2:s(o),hashmap2Label:"unsettled (writing)",counters:[{label:"round",value:`${e+1} / ${K+1}`},{label:"flight",value:`${h}\u2192${d}`}]},variables:[{name:`prices[${h}]`,value:"\u221E"},{name:"action",value:"skip"}]});continue}let p=n[h]+c,m=o[d],f=p<m;f&&(o[d]=p),i.push({explanation:f?`Flight ${h}\u2192${d} ($${c}): prices[${h}] + ${c} = ${p} < unsettled[${d}] (${Q(m)}) \u2192 relax it \u2192 unsettled[${d}] = ${p}.`:`Flight ${h}\u2192${d} ($${c}): prices[${h}] + ${c} = ${p} is not better than unsettled[${d}] (${Q(m)}) \u2192 leave it.`,highlightLine:20,state:{type:"graph",directed:!0,nodes:u(d,n),edges:r(l),hashmap:s(n),hashmapLabel:"prices (locked)",hashmap2:s(o),hashmap2Label:"unsettled (writing)",counters:[{label:"round",value:`${e+1} / ${K+1}`},{label:"flight",value:`${h}\u2192${d}`},{label:"candidate",value:p}]},variables:[{name:`prices[${h}]+${c}`,value:p,highlight:f},{name:`unsettled[${d}]`,value:Q(o[d])}]})}n=o,i.push({explanation:`End of round ${e+1}: commit prices = unsettledPrices \u2192 [${n.map(Q).join(", ")}]. These paths use at most ${e+1} edge(s).`,highlightLine:21,state:{type:"graph",directed:!0,nodes:u(null,n),edges:r(null),hashmap:s(n),hashmapLabel:"prices",counters:[{label:"round done",value:e+1}]},variables:[{name:"prices",value:`[${n.map(Q).join(", ")}]`,highlight:!0}]})}let a=n[oe]===1/0?-1:n[oe];return i.push({explanation:a===-1?`prices[${oe}] is \u221E \u2192 no route within ${K} stop(s). Return -1.`:`prices[dst=${oe}] = ${a}. Return ${a}. Note the cheaper 0\u21921\u21922\u21923 = $400 route is rejected \u2014 it needs 2 stops (3 edges), exceeding k=1.`,highlightLine:24,state:{type:"graph",directed:!0,nodes:u(oe,n),edges:r(null),hashmap:s(n),hashmapLabel:"prices",counters:[{label:"answer",value:a}]},variables:[{name:"return",value:a,highlight:!0}]}),i}var Bo={label:"Bellman-Ford (k+1 rounds)",pythonCode:Fo,generateSteps:Do,timeComplexity:"O(k \xB7 E)",spaceComplexity:"O(n)"},Sa={id:"cheapest-flights-within-k-stops",lcNumber:787,title:"Cheapest Flights Within K Stops",difficulty:"Medium",category:"graphs",tags:["Graph","Dynamic Programming","Shortest Path","Bellman-Ford"],timeComplexity:"O(k \xB7 E)",spaceComplexity:"O(n)",description:"n cities are connected by directed weighted flights. Given src, dst, and k, return the cheapest price from src to dst using at most k stops, or -1 if unreachable.",examples:[{input:"n=4, flights=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src=0, dst=3, k=1",output:"700",explanation:"0\u21921\u21923 costs 700 (1 stop). 0\u21921\u21922\u21923 is cheaper at 400 but uses 2 stops."}],constraints:["1 \u2264 n \u2264 100","flights[i] = [from, to, price]","0 \u2264 src, dst, k < n","src \u2260 dst"],hint:`"At most k stops" means at most k+1 edges. Run k+1 Bellman-Ford rounds; in each round read distances from the previous round (a locked copy) and write into this round's copy, so a single round never chains more than one extra edge.`,solutions:[Bo]};var Ho=`class Node:
    def __init__(self, key, val, prev=None, next=None):
        self.key = key; self.val = val
        self.prev = prev; self.next = next

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = {}                 # key -> Node
        self.capacity = capacity
        self.head = Node(-1, -1)        # dummy MRU end
        self.tail = Node(-1, -1)        # dummy LRU end
        self.head.next = self.tail
        self.tail.prev = self.head

    def remove(self, node) -> None:
        prevNode = node.prev
        nextNode = node.next
        prevNode.next = nextNode
        nextNode.prev = prevNode

    def insert(self, node) -> None:     # insert right after head (MRU)
        headNext = self.head.next
        self.head.next = node
        node.prev = self.head
        node.next = headNext
        headNext.prev = node

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self.remove(node)           # move to MRU
            self.insert(node)
            return node.val
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.remove(self.cache[key])
        newNode = Node(key, value)
        self.insert(newNode)
        self.cache[key] = newNode
        while len(self.cache) > self.capacity:
            lru = self.tail.prev        # node just before dummy tail
            self.remove(lru)
            del self.cache[lru.key]`;var La=[{kind:"put",key:1,value:1},{kind:"put",key:2,value:2},{kind:"get",key:1},{kind:"put",key:3,value:3},{kind:"get",key:2},{kind:"put",key:4,value:4},{kind:"get",key:1},{kind:"get",key:3},{kind:"get",key:4}];function _o(){let i=[],u=[],r=()=>{let t={};return u.forEach(a=>t[a.key]=a.value),t},s=(t,a)=>{let e=["H",...u.map(h=>`k${h.key}`),"T"],o=e.map((h,d)=>{let c=h==="H"||h==="T",p=c?null:u.find(m=>`k${m.key}`===h);return{id:h,x:40+d*82,y:110,state:c?"default":p&&p.key===t?"active":"visited",label:c?h==="H"?"head":"tail":`${p.key}:${p.value}`}}),l=[];for(let h=0;h<e.length-1;h++)l.push({from:e[h],to:e[h+1],state:"default"});return{type:"graph",directed:!0,nodes:o,edges:l,hashmap:r(),hashmapLabel:"cache (key\u2192val)",counters:a}};i.push({explanation:"LRUCache(2). A doubly linked list (dummy head = MRU end, dummy tail = LRU end) gives O(1) move-to-front and O(1) eviction of the least-recently-used node; a hashmap key\u2192Node gives O(1) lookup. Nodes are shown head\u2192\u2026\u2192tail (most\u2192least recently used).",highlightLine:6,state:s(null,[{label:"capacity",value:2},{label:"size",value:0}]),variables:[]});let n=t=>{let a=u.findIndex(o=>o.key===t),[e]=u.splice(a,1);u.unshift(e)};for(let t=0;t<La.length;t++){let a=La[t];if(a.kind==="get"){if(u.some(l=>l.key===a.key)){let l=u.find(h=>h.key===a.key).value;n(a.key),i.push({explanation:`get(${a.key}): key is in cache \u2192 remove it and re-insert at head (now MRU). Return ${l}.`,highlightLine:31,state:s(a.key,[{label:`op #${t+1}`,value:`get(${a.key})`},{label:"return",value:l},{label:"size",value:u.length}]),variables:[{name:"return",value:l,highlight:!0}]})}else i.push({explanation:`get(${a.key}): key not in cache \u2192 return -1. List unchanged.`,highlightLine:36,state:s(null,[{label:`op #${t+1}`,value:`get(${a.key})`},{label:"return",value:-1},{label:"size",value:u.length}]),variables:[{name:"return",value:-1,highlight:!0}]});continue}for(u.some(o=>o.key===a.key)&&(u=u.filter(o=>o.key!==a.key),i.push({explanation:`put(${a.key}, ${a.value}): key already in cache \u2192 remove the old node first (it will be re-inserted at MRU with the new value).`,highlightLine:40,state:s(null,[{label:`op #${t+1}`,value:`put(${a.key},${a.value})`},{label:"size",value:u.length}]),variables:[{name:"existing key",value:a.key}]})),u.unshift({key:a.key,value:a.value}),i.push({explanation:`put(${a.key}, ${a.value}): create a fresh node, insert right after head (MRU), and record cache[${a.key}] = node.`,highlightLine:43,state:s(a.key,[{label:`op #${t+1}`,value:`put(${a.key},${a.value})`},{label:"size",value:u.length}]),variables:[{name:"inserted",value:`${a.key}:${a.value}`,highlight:!0}]});u.length>2;){let o=u[u.length-1];u=u.slice(0,-1),i.push({explanation:`size ${u.length+1} > capacity 2 \u2192 evict LRU. lru = tail.prev = node ${o.key} (nearest the tail). remove it and del cache[${o.key}].`,highlightLine:46,state:s(null,[{label:`op #${t+1}`,value:`put(${a.key},${a.value})`},{label:"evicted",value:o.key},{label:"size",value:u.length}]),variables:[{name:"evicted key",value:o.key,highlight:!0}]})}}return i.push({explanation:"All operations complete. Every get and put touched only O(1) nodes: the hashmap finds the node instantly, and the dummy-headed doubly linked list makes unlinking and re-inserting at the MRU end constant-time.",highlightLine:43,state:s(null,[{label:"final size",value:u.length}]),variables:[]}),i}var Wo={label:"HashMap + Doubly Linked List",pythonCode:Ho,generateSteps:_o,timeComplexity:"O(1) per get/put",spaceComplexity:"O(capacity)"},Oa={id:"lru-cache",lcNumber:146,title:"LRU Cache",difficulty:"Medium",category:"linked-list",tags:["Hash Table","Linked List","Design","Doubly-Linked List"],timeComplexity:"O(1)",spaceComplexity:"O(capacity)",description:"Design a Least Recently Used (LRU) cache with a fixed capacity. get(key) returns the value or -1; put(key, value) inserts/updates and evicts the least-recently-used key when over capacity. Both must run in O(1) average time.",examples:[{input:"capacity=2; put(1,1) put(2,2) get(1) put(3,3) get(2) put(4,4) get(1) get(3) get(4)",output:"[null, null, 1, null, -1, null, -1, 3, 4]",explanation:"put(3,3) evicts key 2 (LRU); put(4,4) evicts key 1."}],constraints:["1 \u2264 capacity \u2264 3000","0 \u2264 key \u2264 10\u2074","0 \u2264 value \u2264 10\u2075","At most 2\xD710\u2075 calls to get and put."],hint:"Combine a hashmap (key\u2192node, O(1) lookup) with a doubly linked list ordered most\u2192least recently used. Use dummy head/tail nodes so insert-at-front and unlink are branch-free O(1). Every access moves its node to the front; eviction removes the node just before the dummy tail.",solutions:[Wo]};var zo=`class Solution:
    def nextGreaterElements(self, nums: List[int]) -> List[int]:
        # circular array \u2014 simulate two passes with i in range(len*2)
        # and modular arithmetic i % len to map back into nums
        # monotonic decreasing stack of INDICES; when we see a greater
        # number, it is the next greater for everything smaller on the stack
        result = [-1] * len(nums)
        decreasingStack = []
        numSize = len(nums)

        for i in range(2 * numSize):
            currentNumberIndex = i % numSize
            while decreasingStack and nums[currentNumberIndex] > nums[decreasingStack[-1]]:
                priorNumberIndex = decreasingStack.pop()
                if result[priorNumberIndex] == -1:
                    result[priorNumberIndex] = nums[currentNumberIndex]
            decreasingStack.append(currentNumberIndex)

        return result`,M=[1,2,3,4,3];function Yo(){let i=[],u=M.length,r=new Array(u).fill(-1),s=[],n=e=>M.map((o,l)=>({value:o,state:l===e?"active":s.includes(l)?"window":r[l]!==-1?"found":"default"})),t=()=>s.map(e=>`i${e}(${M[e]})`),a=()=>`[${r.join(", ")}]`;i.push({explanation:`Next greater element in a CIRCULAR array. Trick: iterate i from 0 to 2\xB7n \u2212 1 and use idx = i % n, so every element gets a second scan that "wraps around". Keep a monotonic decreasing stack of indices \u2014 when the current value exceeds the value at the stack top, the current value is that index's next-greater.`,highlightLine:6,state:{type:"array",cells:n(-1),pointers:[],stackItems:[],counters:[{label:"result",value:a()}]},variables:[]});for(let e=0;e<2*u;e++){let o=e%u,l=e<u?1:2;for(;s.length>0&&M[o]>M[s[s.length-1]];){let h=s[s.length-1];s.pop();let d=r[h]!==-1;d||(r[h]=M[o]),i.push({explanation:`i=${e} (pass ${l}, idx=${o}, value ${M[o]}): value ${M[o]} > nums[top=${h}]=${M[h]} \u2192 pop index ${h}. ${d?`result[${h}] already set \u2014 skip.`:`Set result[${h}] = ${M[o]}.`}`,highlightLine:15,state:{type:"array",cells:n(o),pointers:[{index:o,label:"i%n"}],stackItems:t(),counters:[{label:"i",value:`${e} (pass ${l})`},{label:"popped idx",value:h},{label:"result",value:a()}]},variables:[{name:"nums[idx]",value:M[o],highlight:!0},{name:"priorNumberIndex",value:h},{name:`result[${h}]`,value:r[h]}]})}s.push(o),i.push({explanation:`i=${e} (pass ${l}, idx=${o}): stack top is now \u2265 ${M[o]} (or empty) \u2014 push index ${o} onto the decreasing stack.${l===2?" (2nd pass only resolves elements that wrap around; it never sets a result twice.)":""}`,highlightLine:18,state:{type:"array",cells:n(o),pointers:[{index:o,label:"i%n"}],stackItems:t(),counters:[{label:"i",value:`${e} (pass ${l})`},{label:"stack",value:`[${s.join(",")}]`},{label:"result",value:a()}]},variables:[{name:"pushed idx",value:o,highlight:!0}]})}return i.push({explanation:`Both passes done. Indices still on the stack never found a greater element, so they keep result \u22121. Final: ${a()}.`,highlightLine:20,state:{type:"array",cells:M.map((e,o)=>({value:e,state:r[o]!==-1?"found":"eliminated"})),pointers:[],stackItems:t(),counters:[{label:"result",value:a()}]},variables:[{name:"return",value:a(),highlight:!0}]}),i}var Go={label:"Circular Monotonic Stack (2\xB7n pass)",pythonCode:zo,generateSteps:Yo,timeComplexity:"O(n)",spaceComplexity:"O(n)"},Ca={id:"next-greater-element-ii",lcNumber:503,title:"Next Greater Element II",difficulty:"Medium",category:"stack",tags:["Array","Stack","Monotonic Stack"],timeComplexity:"O(n)",spaceComplexity:"O(n)",description:"Given a circular integer array nums (the element after the last is the first), return the next greater number for every element. The next greater number of x is the first greater number found while traversing forward circularly; \u22121 if none exists.",examples:[{input:"nums = [1,2,1]",output:"[2,-1,2]",explanation:"The second 1 wraps around to find 2."},{input:"nums = [1,2,3,4,3]",output:"[2,3,4,-1,4]"}],constraints:["1 \u2264 nums.length \u2264 10\u2074","-10\u2079 \u2264 nums[i] \u2264 10\u2079"],hint:"Handle circularity by looping 2\xB7n times with idx = i % n. Maintain a monotonic decreasing stack of indices; each time the current value beats the value at the stack top, pop and record the current value as that index's answer. Only the first (unset) result sticks.",solutions:[Go]};var Vo=`class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        # DFS: at each node the best "split" path is node.val + leftPath + rightPath,
        # but we can only RETURN one side up (a path can't fork through the parent)
        maxPath = -math.inf

        def dfs(node):
            nonlocal maxPath
            if not node:
                return 0

            # clamp negatives to 0 \u2014 a negative branch is better dropped
            leftPath = max(dfs(node.left), 0)
            rightPath = max(dfs(node.right), 0)

            maxPath = max(maxPath, node.val + leftPath + rightPath)

            return node.val + max(leftPath, rightPath)

        dfs(root)
        return maxPath`,ge={a:{val:-10,left:"b",right:"c"},b:{val:9,left:null,right:null},c:{val:20,left:"d",right:"e"},d:{val:15,left:null,right:null},e:{val:7,left:null,right:null}},Uo="a",Xo=new Set(["d","c","e"]);function Ko(){let i=[],u={};Object.keys(ge).forEach(e=>u[e]="default");let r=-1/0,s=()=>Object.entries(ge).map(([e,o])=>({id:e,value:o.val,state:u[e],leftId:o.left,rightId:o.right})),n=e=>({type:"tree",nodes:s(),counters:e}),t=()=>r===-1/0?"-\u221E":`${r}`;i.push({explanation:'Maximum path sum \u2014 a path is any node-to-node route (need not pass the root). Postorder DFS: each node computes the best downward path from its left and right (clamping negatives to 0). It updates a global max with node.val + left + right (a path that "peaks" here), but only returns node.val + max(left, right) up, since a parent can extend just one side.',highlightLine:5,state:n([{label:"maxPath",value:t()}]),variables:[]});let a=(e,o)=>{if(e===null)return i.push({explanation:`${o}: null child \u2192 return 0 (contributes nothing).`,highlightLine:10,state:n([{label:"maxPath",value:t()}]),variables:[{name:"return",value:0}]}),0;let l=ge[e];u[e]="active",i.push({explanation:`${o}: enter node ${l.val}. Recurse left, then right (postorder \u2014 children before parent).`,highlightLine:8,state:n([{label:"maxPath",value:t()},{label:"at node",value:l.val}]),variables:[{name:"node.val",value:l.val,highlight:!0}]});let h=a(l.left,`${l.val}.left`),d=a(l.right,`${l.val}.right`),c=Math.max(h,0),p=Math.max(d,0);u[e]="active";let m=l.val+c+p,f=r;r=Math.max(r,m);let g=l.val+Math.max(c,p);return u[e]="visited",i.push({explanation:`${o}: leftPath = max(${h}, 0) = ${c}, rightPath = max(${d}, 0) = ${p}. Split candidate = ${l.val} + ${c} + ${p} = ${m}. maxPath = max(${f===-1/0?"-\u221E":f}, ${m}) = ${t()}. Return ${l.val} + max(${c}, ${p}) = ${g} (only one side goes up).`,highlightLine:17,state:n([{label:"maxPath",value:t()},{label:"candidate",value:m},{label:"return",value:g}]),variables:[{name:"leftPath",value:c},{name:"rightPath",value:p},{name:"candidate",value:m,highlight:m===r},{name:"return",value:g,highlight:!0}]}),g};return a(Uo,"root"),Object.keys(ge).forEach(e=>u[e]=Xo.has(e)?"found":"visited"),i.push({explanation:`DFS complete. maxPath = ${t()}, achieved by the highlighted path 15 \u2192 20 \u2192 7 (peaking at node 20: 15 + 20 + 7 = 42). Return ${t()}.`,highlightLine:21,state:n([{label:"answer",value:t()}]),variables:[{name:"return",value:r,highlight:!0}]}),i}var Qo={label:"Postorder DFS (global max)",pythonCode:Vo,generateSteps:Ko,timeComplexity:"O(n)",spaceComplexity:"O(h)"},Ma={id:"binary-tree-maximum-path-sum",lcNumber:124,title:"Binary Tree Maximum Path Sum",difficulty:"Hard",category:"trees",tags:["Tree","DFS","Dynamic Programming","Recursion"],timeComplexity:"O(n)",spaceComplexity:"O(h)",description:"A path is a sequence of nodes connected by edges, each node used at most once; it need not pass through the root. Return the maximum path sum of any non-empty path.",examples:[{input:"root = [1,2,3]",output:"6",explanation:"2 \u2192 1 \u2192 3"},{input:"root = [-10,9,20,null,null,15,7]",output:"42",explanation:"15 \u2192 20 \u2192 7"}],constraints:["The number of nodes is in [1, 3\xD710\u2074].","-1000 \u2264 Node.val \u2264 1000"],hint:"Postorder DFS. Each call returns the best single downward extension (node.val + max(left, right), negatives clamped to 0), but updates a global answer with the through-path node.val + left + right that peaks at this node.",solutions:[Qo]};var Jo=`class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        # Dijkstra = BFS with a min-heap instead of a queue (weighted edges)
        adjMap = collections.defaultdict(list)
        hasShortest = set()
        minTime = 0

        for source, target, weight in times:
            adjMap[source].append((target, weight))

        minHeap = []
        heapq.heappush(minHeap, (0, k))   # 0 time to reach start k

        while minHeap:
            cumulativeWeightToNode, node = heapq.heappop(minHeap)
            if node in hasShortest:        # already finalized \u2014 skip
                continue
            hasShortest.add(node)
            # popped in increasing order, so this is the shortest to 'node'
            minTime = cumulativeWeightToNode

            for neighborNode, neighborWeight in adjMap[node]:
                if neighborNode not in hasShortest:
                    heapq.heappush(minHeap, (neighborWeight + cumulativeWeightToNode, neighborNode))

        if len(hasShortest) == n:
            return minTime
        return -1`,Ta=[[2,1,1],[2,3,1],[3,4,1]],J=4,Oe=2,Na={2:{x:60,y:120},1:{x:175,y:55},3:{x:175,y:190},4:{x:300,y:120}};function Zo(){let i=[],u={};for(let[h,d,c]of Ta)(u[h]??=[]).push([d,c]);let r=new Set,s=0,n=[],t=(h,d)=>{n.push([h,d]),n.sort((c,p)=>c[0]-p[0]||c[1]-p[1])},a=h=>[1,2,3,4].map(d=>({id:d,x:Na[d].x,y:Na[d].y,state:d===h?"active":r.has(d)?"found":"default",label:`${d}`})),e=(h,d)=>Ta.map(([c,p])=>({from:c,to:p,state:c===h&&p===d?"active":r.has(c)&&r.has(p)?"found":"default"})),o=()=>n.map(([h,d])=>`(${h}, n${d})`);for(t(0,Oe),i.push({explanation:`Dijkstra from k=${Oe}. Build adjacency map from times, then push (0, ${Oe}) \u2014 it costs 0 to reach the start. We pop the smallest cumulative time each step; because edge weights are non-negative, the first time we pop a node it is via its shortest path. minTime tracks the largest such time (the slowest node to hear the signal).`,highlightLine:13,state:{type:"graph",directed:!0,nodes:a(null),edges:e(null,null),stackItems:o(),stackLabel:"minHeap (time, node)",counters:[{label:"minTime",value:s},{label:"settled",value:`0 / ${J}`}]},variables:[]});n.length>0;){let[h,d]=n.shift();if(r.has(d)){i.push({explanation:`Pop (${h}, ${d}): node ${d} is already settled \u2192 skip (a shorter path to it was popped earlier).`,highlightLine:18,state:{type:"graph",directed:!0,nodes:a(d),edges:e(null,null),stackItems:o(),stackLabel:"minHeap (time, node)",counters:[{label:"minTime",value:s},{label:"settled",value:`${r.size} / ${J}`}]},variables:[{name:"popped",value:`(${h}, ${d})`},{name:"action",value:"skip"}]});continue}r.add(d),s=h,i.push({explanation:`Pop (${h}, ${d}): first time settling node ${d} \u2192 this is its shortest arrival time. Set minTime = ${h}. Now relax its outgoing edges.`,highlightLine:21,state:{type:"graph",directed:!0,nodes:a(d),edges:e(null,null),stackItems:o(),stackLabel:"minHeap (time, node)",counters:[{label:"minTime",value:s},{label:"settled",value:`${r.size} / ${J}`}]},variables:[{name:"node",value:d,highlight:!0},{name:"minTime",value:s,highlight:!0}]});for(let[c,p]of u[d]??[])r.has(c)||(t(h+p,c),i.push({explanation:`Edge ${d}\u2192${c} (weight ${p}): push (${h} + ${p} = ${h+p}, ${c}) onto the heap. It will only settle ${c} if nothing cheaper reaches it first.`,highlightLine:25,state:{type:"graph",directed:!0,nodes:a(d),edges:e(d,c),stackItems:o(),stackLabel:"minHeap (time, node)",counters:[{label:"minTime",value:s},{label:"settled",value:`${r.size} / ${J}`}]},variables:[{name:"neighbor",value:c},{name:"new dist",value:h+p,highlight:!0}]}))}let l=r.size===J?s:-1;return i.push({explanation:l===-1?`Heap empty but only ${r.size}/${J} nodes were reached \u2192 some node never gets the signal. Return -1.`:`Heap empty and all ${J} nodes settled \u2192 every node received the signal. The slowest arrival is minTime = ${s}. Return ${s}.`,highlightLine:l===-1?30:29,state:{type:"graph",directed:!0,nodes:a(null),edges:e(null,null),stackItems:[],counters:[{label:"answer",value:l}]},variables:[{name:"return",value:l,highlight:!0}]}),i}var eu={label:"Dijkstra (min-heap)",pythonCode:Jo,generateSteps:Zo,timeComplexity:"O(E log V)",spaceComplexity:"O(V + E)"},Ia={id:"network-delay-time",lcNumber:743,title:"Network Delay Time",difficulty:"Medium",category:"graphs",tags:["Graph","Shortest Path","Dijkstra","Heap"],timeComplexity:"O(E log V)",spaceComplexity:"O(V + E)",description:"n nodes (1..n) with directed travel times times[i] = (u, v, w). Send a signal from node k; return the minimum time for all nodes to receive it, or -1 if some node never does.",examples:[{input:"times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",output:"2"},{input:"times = [[1,2,1]], n = 2, k = 2",output:"-1"}],constraints:["1 \u2264 k \u2264 n \u2264 100","1 \u2264 times.length \u2264 6000","0 \u2264 w \u2264 100","All (u, v) pairs are unique."],hint:"Dijkstra from k. Pop the smallest cumulative time; the first pop of a node is its shortest arrival (non-negative weights guarantee this). The answer is the maximum shortest-arrival across all nodes \u2014 or -1 if any node is never settled.",solutions:[eu]};var tu=`class TrieNode:
    def __init__(self):
        self.children = {}
        self.isWord = False

class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        traversal = self.root
        for char in word:
            if char not in traversal.children:
                traversal.children[char] = TrieNode()
            traversal = traversal.children[char]
        traversal.isWord = True

    def search(self, word: str) -> bool:
        # walk known chars; on '.' recurse into every child
        def dfs(i, node):
            currentNode = node
            for j in range(i, len(word)):
                char = word[j]
                if char == '.':
                    for child in currentNode.children.values():
                        if dfs(j + 1, child):
                            return True
                    return False
                else:
                    if char not in currentNode.children:
                        return False
                    currentNode = currentNode.children[char]
            return currentNode.isWord
        return dfs(0, self.root)`,R={r:{id:"r",char:"\u2022",x:180,y:30,children:{b:"nb",d:"nd",m:"nm"},isWord:!1},nb:{id:"nb",char:"b",x:70,y:95,children:{a:"nba"},isWord:!1},nba:{id:"nba",char:"a",x:70,y:160,children:{d:"nbad"},isWord:!1},nbad:{id:"nbad",char:"d",x:70,y:225,children:{},isWord:!0},nd:{id:"nd",char:"d",x:180,y:95,children:{a:"nda"},isWord:!1},nda:{id:"nda",char:"a",x:180,y:160,children:{d:"ndad"},isWord:!1},ndad:{id:"ndad",char:"d",x:180,y:225,children:{},isWord:!0},nm:{id:"nm",char:"m",x:290,y:95,children:{a:"nma"},isWord:!1},nma:{id:"nma",char:"a",x:290,y:160,children:{d:"nmad"},isWord:!1},nmad:{id:"nmad",char:"d",x:290,y:225,children:{},isWord:!0}};function au(){let i=[],u=new Set(["r"]),r=(e,o)=>[...u].map(l=>{let h=R[l];return{id:l,x:h.x,y:h.y,state:l===e?"active":o.has(l)?"found":"visited",label:h.isWord?`${h.char}\u2713`:h.char}}),s=e=>{let o=[];for(let l of u)for(let h of Object.values(R[l].children))u.has(h)&&o.push({from:l,to:h,state:e.has(l)&&e.has(h)?"found":"default"});return o},n=(e,o,l)=>({type:"graph",directed:!0,nodes:r(e,o),edges:s(o),counters:l});i.push({explanation:'WordDictionary backed by a trie. addWord inserts a path of characters and flags the last node isWord (shown \u2713). search matches known characters directly, but on a "." wildcard it must recurse into every child. Root is \u2022.',highlightLine:5,state:n(null,new Set,[{label:"words",value:0}]),variables:[]});let t=(e,o)=>{let l=0,h="r",d=new Set(["r"]);for(let c=0;c<e.length;c++){let p=o[c],m=!u.has(p);u.add(p),h=p,d.add(p),l++,i.push({explanation:`addWord("${e}"): char '${e[c]}' \u2192 ${m?"not present, create a new TrieNode":"already present, descend"}. Move to it.${c===e.length-1?` Mark it isWord = True (end of "${e}").`:""}`,highlightLine:m?16:17,state:n(h,d,[{label:"addWord",value:`"${e}"`},{label:"depth",value:l}]),variables:[{name:"char",value:e[c],highlight:!0},{name:"isWord",value:c===e.length-1?"True":"False"}]})}};t("bad",["nb","nba","nbad"]),t("dad",["nd","nda","ndad"]),t("mad",["nm","nma","nmad"]);let a=e=>{i.push({explanation:`search("${e}"): start dfs at root, index 0.`,highlightLine:21,state:n("r",new Set(["r"]),[{label:"search",value:`"${e}"`}]),variables:[]});let o=(l,h,d)=>{let c=h,p=new Set(d);p.add(c);for(let f=l;f<e.length;f++){let g=e[f];if(g==="."){let v=Object.values(R[c].children);i.push({explanation:`Position ${f}: '.' wildcard at node '${R[c].char}' \u2192 try every child (${v.map(w=>`'${R[w].char}'`).join(", ")||"none"}).`,highlightLine:27,state:n(c,p,[{label:"search",value:`"${e}"`},{label:"index",value:f},{label:"char",value:". (wildcard)"}]),variables:[{name:"wildcard",value:"yes",highlight:!0}]});for(let w of v)if(o(f+1,w,p))return!0;return i.push({explanation:`Position ${f}: no child of '${R[c].char}' led to a match \u2192 return False for this branch.`,highlightLine:30,state:n(c,p,[{label:"search",value:`"${e}"`},{label:"index",value:f},{label:"result",value:"False"}]),variables:[{name:"return",value:"False"}]}),!1}else{if(!(g in R[c].children))return i.push({explanation:`Position ${f}: '${g}' is not a child of node '${R[c].char}' \u2192 dead end, return False.`,highlightLine:33,state:n(c,p,[{label:"search",value:`"${e}"`},{label:"index",value:f},{label:"char",value:g},{label:"result",value:"False"}]),variables:[{name:"char",value:g},{name:"return",value:"False",highlight:!0}]}),!1;c=R[c].children[g],p.add(c),i.push({explanation:`Position ${f}: '${g}' matches \u2192 descend to it.`,highlightLine:35,state:n(c,p,[{label:"search",value:`"${e}"`},{label:"index",value:f},{label:"char",value:g}]),variables:[{name:"char",value:g,highlight:!0}]})}}let m=R[c].isWord;return i.push({explanation:`Reached end of "${e}" at node '${R[c].char}'. isWord = ${m?"True":"False"} \u2192 return ${m?"True":"False"}.`,highlightLine:36,state:n(c,p,[{label:"search",value:`"${e}"`},{label:"isWord",value:m?"True":"False"}]),variables:[{name:"isWord",value:m?"True":"False",highlight:!0}]}),m};return o(0,"r",new Set)};return a("pad"),a(".ad"),a("b.."),i.push({explanation:'Done. addWord is O(word length). search is O(word length) for exact queries; each "." can branch to all 26 children, so worst case is O(26^(#dots) \xB7 length) \u2014 the wildcard is what makes this more than a plain trie lookup.',highlightLine:37,state:n(null,new Set,[{label:"complete",value:"yes"}]),variables:[]}),i}var nu={label:"Trie + Wildcard DFS",pythonCode:tu,generateSteps:au,timeComplexity:"O(len) add; O(26^dots \xB7 len) search",spaceComplexity:"O(total chars)"},qa={id:"design-add-and-search-words",lcNumber:211,title:"Design Add and Search Words Data Structure",difficulty:"Medium",category:"trie",tags:["Trie","DFS","Design","Backtracking"],timeComplexity:"O(len) add",spaceComplexity:"O(total chars)",description:'Design WordDictionary supporting addWord(word) and search(word), where search may contain "." matching any single letter.',examples:[{input:'addWord("bad"), addWord("dad"), addWord("mad"), search("pad"), search("bad"), search(".ad"), search("b..")',output:"false, true, true, true"}],constraints:["1 \u2264 word.length \u2264 25","search words may contain up to 2 dots (LeetCode)","At most 10\u2074 calls."],hint:'Store words in a trie. Exact characters walk a single path. A "." forks the search: recurse into every child at that node and succeed if any branch matches \u2014 a DFS with backtracking over the trie.',solutions:[nu]};var iu=`class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        # Prim's MST via a min-heap of (edge cost, node); complete graph, no adj map
        numberOfNodes = len(points)
        totalCost = 0
        visited = set()

        def manhattanDistance(a, b):
            return abs(a[0] - b[0]) + abs(a[1] - b[1])

        minHeap = []
        heapq.heappush(minHeap, (0, 0))       # start at node 0, cost 0

        while len(visited) < numberOfNodes:
            cost, node = heapq.heappop(minHeap)
            if node in visited:               # already in the tree \u2014 skip
                continue
            totalCost += cost
            visited.add(node)
            for neighbor in range(numberOfNodes):
                if neighbor not in visited:
                    distance = manhattanDistance(points[node], points[neighbor])
                    heapq.heappush(minHeap, (distance, neighbor))
        return totalCost`,su=`class Solution:
    # O(n^2) Prim's \u2014 no heap; scan for the closest unvisited node each round
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        visited = set()
        distance = [math.inf] * len(points)
        distance[0] = 0

        def getClosestNode():
            closestDistance, closestNode = math.inf, -1
            for i in range(len(points)):
                if i not in visited and distance[i] < closestDistance:
                    closestDistance, closestNode = distance[i], i
            return closestNode

        def relax(index):
            for i in range(len(points)):
                if i not in visited and i != index:
                    manhattan = abs(points[i][0] - points[index][0]) + abs(points[i][1] - points[index][1])
                    distance[i] = min(distance[i], manhattan)

        while len(visited) < len(points):
            nextNode = getClosestNode()
            if nextNode == -1:
                return -1
            relax(nextNode)
            visited.add(nextNode)
        return sum(distance)`,z=[[0,0],[2,2],[3,10],[5,2],[7,0]],L=z.length,Pa=(i,u)=>Math.abs(i[0]-u[0])+Math.abs(i[1]-u[1]),Ra=i=>({x:40+z[i][0]*32,y:30+z[i][1]*18});function F(i,u){return z.map((r,s)=>({id:s,x:Ra(s).x,y:Ra(s).y,state:s===u?"active":i.has(s)?"found":"default",label:`${s}(${r[0]},${r[1]})`}))}function D(i,u){let r=i.map(([s,n])=>({from:s,to:n,state:"found"}));return u&&r.push({from:u[0],to:u[1],state:"active"}),r}function ru(){let i=[],u=new Set,r=0,s=[],n=[],t=(e,o,l)=>{s.push([e,o,l]),s.sort((h,d)=>h[0]-d[0]||h[1]-d[1])},a=()=>s.map(([e,o])=>`(${e}, n${o})`);for(t(0,0,-1),i.push({explanation:"Prim's MST with a min-heap. The graph is complete (every pair of points is an edge with Manhattan-distance cost), so no adjacency map \u2014 we generate edges on the fly. Start by pushing (0, node 0). Each round pop the cheapest edge that reaches a NEW node.",highlightLine:12,state:{type:"graph",nodes:F(u,null),edges:D(n,null),stackItems:a(),stackLabel:"minHeap (cost, node)",counters:[{label:"totalCost",value:0},{label:"in tree",value:`0 / ${L}`}]},variables:[]});u.size<L;){let[e,o,l]=s.shift();if(u.has(o)){i.push({explanation:`Pop (${e}, ${o}): node ${o} is already in the tree \u2192 skip (a cheaper edge already connected it).`,highlightLine:17,state:{type:"graph",nodes:F(u,o),edges:D(n,null),stackItems:a(),stackLabel:"minHeap (cost, node)",counters:[{label:"totalCost",value:r},{label:"in tree",value:`${u.size} / ${L}`}]},variables:[{name:"popped",value:`(${e}, ${o})`},{name:"action",value:"skip"}]});continue}u.add(o),r+=e;let h=l>=0?[l,o]:null;h&&n.push(h),i.push({explanation:`Pop (${e}, ${o}): node ${o} is new \u2192 add it to the tree via edge ${l>=0?`${l}\u2013${o}`:"(root)"} of cost ${e}. totalCost = ${r}.`,highlightLine:20,state:{type:"graph",nodes:F(u,o),edges:D(n,null),stackItems:a(),stackLabel:"minHeap (cost, node)",counters:[{label:"totalCost",value:r},{label:"in tree",value:`${u.size} / ${L}`}]},variables:[{name:"node",value:o,highlight:!0},{name:"totalCost",value:r,highlight:!0}]});let d=[];for(let c=0;c<L;c++)if(!u.has(c)){let p=Pa(z[o],z[c]);t(p,c,o),d.push(`${c}:${p}`)}d.length>0&&i.push({explanation:`From node ${o}, push an edge to every unvisited node: ${d.map(c=>`\u2192${c.split(":")[0]} cost ${c.split(":")[1]}`).join(", ")}. The heap keeps the globally cheapest frontier edge on top.`,highlightLine:24,state:{type:"graph",nodes:F(u,o),edges:D(n,null),stackItems:a(),stackLabel:"minHeap (cost, node)",counters:[{label:"totalCost",value:r},{label:"in tree",value:`${u.size} / ${L}`}]},variables:[{name:"pushed edges",value:d.length}]})}return i.push({explanation:`All ${L} points connected \u2192 return totalCost = ${r}. The MST edges are highlighted.`,highlightLine:25,state:{type:"graph",nodes:F(u,null),edges:D(n,null),stackItems:[],counters:[{label:"answer",value:r}]},variables:[{name:"return",value:r,highlight:!0}]}),i}function lu(){let i=[],u=new Set,r=new Array(L).fill(1/0);r[0]=0;let s=new Array(L).fill(-1),n=[],t=e=>{let o={};return r.forEach((l,h)=>o[h]=u.has(h)?"\u2713":l===1/0?"\u221E":`${l}`),o};for(i.push({explanation:"Same Prim's MST, but O(n\xB2) with no heap. distance[i] = cheapest edge from the current tree to node i (\u221E until reachable, 0 for the start). Each round: scan for the closest unvisited node, add it, and relax every other node's distance against it.",highlightLine:6,state:{type:"graph",nodes:F(u,null),edges:D(n,null),hashmap:t(null),hashmapLabel:"distance[]",counters:[{label:"in tree",value:`0 / ${L}`}]},variables:[{name:"distance",value:`[${r.map(e=>e===1/0?"\u221E":e).join(", ")}]`}]});u.size<L;){let e=-1,o=1/0;for(let d=0;d<L;d++)!u.has(d)&&r[d]<o&&(o=r[d],e=d);if(e===-1)break;let l=s[e]>=0?[s[e],e]:null;l&&n.push(l),u.add(e),i.push({explanation:`getClosestNode \u2192 node ${e} (distance ${o}${l?`, via edge ${l[0]}\u2013${l[1]}`:" \u2014 the start"}). Add it to the tree.`,highlightLine:9,state:{type:"graph",nodes:F(u,e),edges:D(n,null),hashmap:t(e),hashmapLabel:"distance[]",counters:[{label:"in tree",value:`${u.size} / ${L}`},{label:"added",value:e}]},variables:[{name:"nextNode",value:e,highlight:!0},{name:"cost",value:o}]});let h=[];for(let d=0;d<L;d++)if(!u.has(d)&&d!==e){let c=Pa(z[d],z[e]);c<r[d]&&(r[d]=c,s[d]=e,h.push(`${d}\u2192${c}`))}i.push({explanation:`relax(${e}): for each unvisited node, distance[i] = min(distance[i], manhattan(i, ${e})). ${h.length>0?`Improved: ${h.join(", ")}.`:"No improvements this round."}`,highlightLine:15,state:{type:"graph",nodes:F(u,e),edges:D(n,null),hashmap:t(e),hashmapLabel:"distance[]",counters:[{label:"in tree",value:`${u.size} / ${L}`}]},variables:[{name:"distance",value:`[${r.map((d,c)=>u.has(c)?"\u2713":d===1/0?"\u221E":d).join(", ")}]`,highlight:h.length>0}]})}let a=r.reduce((e,o)=>e+(o===1/0?0:o),0);return i.push({explanation:`All nodes visited \u2192 return sum(distance) = ${a}. Each entry is the edge cost that first connected that node to the tree, so the sum is the MST weight.`,highlightLine:25,state:{type:"graph",nodes:F(u,null),edges:D(n,null),hashmap:t(null),hashmapLabel:"distance[]",counters:[{label:"answer",value:a}]},variables:[{name:"return",value:a,highlight:!0}]}),i}var ou={label:"Prim's \u2014 Min-Heap",pythonCode:iu,generateSteps:ru,timeComplexity:"O(n\xB2 log n)",spaceComplexity:"O(n\xB2)"},uu={label:"Prim's \u2014 O(n\xB2) array",pythonCode:su,generateSteps:lu,timeComplexity:"O(n\xB2)",spaceComplexity:"O(n)"},Aa={id:"min-cost-connect-all-points",lcNumber:1584,title:"Min Cost to Connect All Points",difficulty:"Medium",category:"graphs",tags:["Graph","Minimum Spanning Tree","Prim","Heap"],timeComplexity:"O(n\xB2)",spaceComplexity:"O(n)",description:"Given points on a 2D plane, connect all of them with minimum total cost, where the cost between two points is their Manhattan distance. All points are connected when exactly one simple path exists between any two.",examples:[{input:"points = [[0,0],[2,2],[3,10],[5,2],[7,0]]",output:"20"},{input:"points = [[3,12],[-2,5],[-4,1]]",output:"18"}],constraints:["1 \u2264 points.length \u2264 1000","-10\u2076 \u2264 xi, yi \u2264 10\u2076","All points are distinct."],hint:"It's a Minimum Spanning Tree over a complete graph. Prim's grows one tree: repeatedly add the cheapest edge from the tree to a node outside it. Use a min-heap of frontier edges (O(n\xB2 log n)), or, since the graph is dense, an O(n\xB2) distance-array scan.",solutions:[ou,uu]};var N=[Ce,gt,At,Me,Te,jt,Ie,Ve,et,rt,Ft,Ne,Ue,it,Ge,Ht,_t,Xe,oa,ua,nt,Et,Be,mt,He,Qe,Ze,at,_e,Je,ze,We,bt,qe,Ke,ht,yt,wt,Re,ut,vt,st,ft,$t,xt,Bt,Wt,Ee,lt,Fe,tt,ot,da,fa,Oa,zt,Yt,Gt,Vt,Ut,Xt,Kt,Jt,Zt,ta,na,ba,Ma,je,pt,Ct,kt,De,St,Lt,Ot,Mt,Tt,It,qt,Sa,Ia,Aa,Ae,ca,ma,Ca,Ye,xa,Pt,ia,ra,sa,la,pa,qa],Ea={"arrays-hash":N.filter(i=>i.category==="arrays-hash"),"two-pointers":N.filter(i=>i.category==="two-pointers"),"sliding-window":N.filter(i=>i.category==="sliding-window"),"binary-search":N.filter(i=>i.category==="binary-search"),"linked-list":N.filter(i=>i.category==="linked-list"),trees:N.filter(i=>i.category==="trees"),graphs:N.filter(i=>i.category==="graphs"),stack:N.filter(i=>i.category==="stack"),greedy:N.filter(i=>i.category==="greedy"),heap:N.filter(i=>i.category==="heap"),trie:N.filter(i=>i.category==="trie"),"dynamic-programming":N.filter(i=>i.category==="dynamic-programming")},ja=new Map;function hu(i){let u=ja.get(i.id);if(u!==void 0)return u;let r=i.solutions.some(s=>s.generateSteps().length>0);return ja.set(i.id,r),r}function yp(i){return i.filter(hu).length}function bp(i,u){return Ea[i]?.find(r=>r.id===u)}function wp(i,u){let r=Ea[i]??[],s=r.findIndex(n=>n.id===u);return{prev:s>0?r[s-1]:null,next:s<r.length-1?r[s+1]:null}}export{N as a,Ea as b,hu as c,yp as d,bp as e,wp as f};
